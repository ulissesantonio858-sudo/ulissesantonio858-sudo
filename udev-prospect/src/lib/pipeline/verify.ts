import type { Db } from "../db";
import { analyzeWebsite, type SiteDeps } from "../analysis/site";
import { analyzeHtml, mentionsLocality } from "../analysis/html";
import type { EvidenceDraft, OpportunityDraft } from "../analysis/types";
import { haversineKm, type GeoPoint } from "../domain/geo";
import { classifyNiche, nicheByKey } from "../domain/niches";
import { companyDomain, isSharedPlatform, normalizeUrl, stripAccents } from "../domain/normalize";
import type { Rubric } from "../domain/rubric";
import { safeFetch } from "../net/safe-fetch";
import type { AiProvider } from "../providers/ai";
import { ProviderNotConfiguredError, QuotaExceededError, type UsageGuard, type WebSearchProvider } from "../providers/types";
import { insertEvidences, openConflict, supersedeEvidence, syncOpportunities, upsertContacts, type CompanyRow } from "./repo";
import { scoreCompany } from "./score";

export interface VerifyContext {
  center: GeoPoint | null;
  radiusKm: number;
  postcodePrefixes: string[];
  excludeTerms: string[];
  targetLocality: string | null;
  targetNiches: string[];
  mode: "clients" | "agencies";
  searchId: string | null;
  rubric: Rubric;
  rubricVersion: number;
}

export interface VerifyDeps {
  webSearch: WebSearchProvider | null;
  ai: AiProvider | null;
  guard: UsageGuard;
  site?: SiteDeps;
}

const SITE_OPPORTUNITY_TYPES = ["dns_not_found", "homepage_error", "tls_error", "service_page_error", "contact_page_error", "placeholder_text",
  "booking_link_error", "cta_wrong_destination", "no_contact_path", "no_viewport", "no_https", "mobile_menu_inaccessible", "contact_overlapped", "mobile_overflow", "website_not_located"];

/** Verificação completa de uma empresa: localização, presença digital, site, contactos, classificação e pontuação. */
export async function verifyCompany(db: Db, companyIn: CompanyRow, ctx: VerifyContext, deps: VerifyDeps) {
  let company = companyIn;
  const notes: string[] = [];
  const now = new Date().toISOString();

  // 1) Localização: distância ao centro e termos de exclusão (ex.: Vila Real de Santo António)
  let locationStatus: CompanyRow["location_status"] = company.location_status;
  let distance = company.distance_km;
  if (!company.locked_fields.includes("location")) {
    const addr = stripAccents(`${company.address ?? ""} ${company.locality ?? ""}`.toLowerCase());
    const excluded = ctx.excludeTerms.some((t) => addr.includes(stripAccents(t.toLowerCase())));
    if (ctx.center && company.lat != null && company.lng != null) distance = haversineKm(ctx.center, { lat: company.lat, lng: company.lng });
    if (excluded || (distance != null && distance > ctx.radiusKm)) locationStatus = "outside_region";
    else if (distance != null) {
      const postcodeOk = !!company.postcode && ctx.postcodePrefixes.some((p) => company.postcode!.startsWith(p));
      const localityOk = !!ctx.targetLocality && mentionsLocality(addr, ctx.targetLocality);
      locationStatus = postcodeOk || localityOk || !ctx.postcodePrefixes.length ? "confirmed" : "inferred";
    } else if (company.postcode && ctx.postcodePrefixes.some((p) => company.postcode!.startsWith(p))) locationStatus = "inferred";
    else locationStatus = "unverified";
  }

  // 2) Presença digital
  let websiteUrl = company.website_url && !isSharedPlatform(company.website_url) ? company.website_url : null;
  const evidenceDrafts: EvidenceDraft[] = [];
  const oppDrafts: OpportunityDraft[] = [];
  let websiteStatus: CompanyRow["website_status"] = company.website_status;
  let foundBySearch = false;
  if (company.website_url && isSharedPlatform(company.website_url)) {
    evidenceDrafts.push({ key: "shared", field: "website", value: company.website_url, sourceType: "website", sourceUrl: company.website_url,
      method: "a ligação \"site\" da listagem aponta para uma plataforma partilhada (rede social/marcações), não para um site próprio", status: "inferred", observedAt: now });
  }
  if (!websiteUrl && !company.locked_fields.includes("website")) {
    if (!deps.webSearch?.configured()) {
      websiteStatus = "not_verified";
      evidenceDrafts.push({ key: "nosearch", field: "website_search", value: null, sourceType: "web_search", sourceUrl: null,
        method: "sem site na listagem e pesquisa web não configurada — presença digital não verificada", status: "unavailable", observedAt: now });
    } else {
      const query = `"${company.name}" ${company.locality ?? ctx.targetLocality ?? ""}`.trim();
      try {
        const results = await deps.webSearch.search(query, deps.guard, 10);
        const checked: { url: string; result: string }[] = [];
        for (const r of results) {
          if (checked.length >= 4) break;
          const url = normalizeUrl(r.url);
          if (!url) continue;
          if (isSharedPlatform(url)) { checked.push({ url, result: "plataforma partilhada (ignorada como site próprio)" }); continue; }
          const home = await safeFetch(new URL(url).origin + "/", deps.site?.fetchOptions);
          if (home.outcome !== "ok") { checked.push({ url, result: `não verificável (${home.outcome})` }); continue; }
          const a = analyzeHtml(home.body, home.finalUrl, company.name);
          const phones = new Set([...a.tel, ...a.phonesInText]);
          const phoneMatch = !!company.phone_e164 && phones.has(company.phone_e164);
          const localityMatch = !!(company.locality ?? ctx.targetLocality) && mentionsLocality(a.textSample, (company.locality ?? ctx.targetLocality)!);
          if (a.mentionsName && (phoneMatch || localityMatch)) {
            checked.push({ url: home.finalUrl, result: `corresponde (nome + ${phoneMatch ? "telefone" : "localidade"})` });
            websiteUrl = home.finalUrl;
            foundBySearch = true;
            break;
          }
          checked.push({ url, result: "não corresponde à empresa" });
        }
        evidenceDrafts.push({ key: "search", field: "website_search", value: websiteUrl, sourceType: "web_search", sourceUrl: null,
          method: `${deps.webSearch.label}: consulta ${query}; ${results.length} resultado(s); verificados ${checked.length}`, status: websiteUrl ? "inferred" : "not_found",
          observedAt: now, details: { query, provider: deps.webSearch.id, results: results.length, checked } });
        if (!websiteUrl) {
          websiteStatus = "not_located";
          oppDrafts.push({ type: "website_not_located", tier: "not_located", verification: "documented_search",
            observed: `Nenhum site próprio localizado: a listagem não indica site e a pesquisa "${query}" (${results.length} resultados, ${now.slice(0, 10)}) não devolveu um site correspondente. Hipótese a confirmar — pode existir.`,
            possibleImpact: "Pode ser mais difícil encontrar informação e contactos fora das listagens (a confirmar em conversa).",
            suggestedImprovement: "Perguntar pela presença digital atual antes de propor um site.", evidenceKeys: ["search"] });
        }
      } catch (e) {
        if (e instanceof QuotaExceededError || e instanceof ProviderNotConfiguredError) notes.push(e.message);
        else notes.push(`pesquisa web falhou: ${(e as Error).message}`);
        websiteStatus = "not_verified";
        evidenceDrafts.push({ key: "searchfail", field: "website_search", value: null, sourceType: "web_search", sourceUrl: null,
          method: `pesquisa web não concluída: ${(e as Error).message.slice(0, 200)}`, status: "unavailable", observedAt: now });
      }
    }
  }

  await supersedeEvidence(db, company.id, ["website", "playwright", "web_search"], ["website", "issue:", "phone", "email", "whatsapp", "instagram", "facebook", "linkedin", "contact_form", "booking", "activity", "agency_webdev_offer"]);
  let identityStatus: CompanyRow["identity_status"] = company.identity_status;
  let analysisId: string | null = null;
  let offersWebdev: boolean | null = null;
  let pageSample: string | null = null;

  if (websiteUrl) {
    const site = await analyzeWebsite({ url: websiteUrl, companyName: company.name, locality: company.locality ?? ctx.targetLocality,
      knownPhones: company.phone_e164 ? [company.phone_e164] : [], isAgency: company.is_agency || ctx.mode === "agencies" }, deps.site);
    websiteStatus = site.websiteStatus === "confirmed" ? "confirmed" : site.websiteStatus;
    if (site.websiteStatus === "conflict" && foundBySearch) websiteStatus = "conflict";
    const { rows } = await db.query<{ id: string }>(
      `insert into site_analyses (company_id, url, outcome, http_status, final_url, attempts, pages, mobile, tools) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [company.id, websiteUrl, site.outcome, site.httpStatus, site.finalUrl, site.attempts, JSON.stringify(site.pages), site.mobile ? JSON.stringify(site.mobile) : null, JSON.stringify(site.tools)]);
    analysisId = rows[0].id;
    evidenceDrafts.push(...site.evidences);
    oppDrafts.push(...site.opportunities);
    offersWebdev = site.agencyOffersWebdev;
    pageSample = site.textSample;
    if (offersWebdev != null) evidenceDrafts.push({ key: "offers", field: "agency_webdev_offer", value: offersWebdev ? "yes" : "no", sourceType: "website", sourceUrl: site.finalUrl,
      method: "palavras-chave de serviços web na página inicial e páginas de serviços (análise de texto)", status: "inferred", observedAt: now });

    // Identidade: listagem (nome+coordenadas) + site que menciona o nome ou o mesmo telefone
    const hasListing = !!(company.google_place_id || company.osm_id);
    if (site.websiteStatus === "confirmed" && (site.identity.nameOnSite || site.identity.phoneMatch)) {
      identityStatus = hasListing && (site.identity.phoneMatch || site.identity.localityOnSite || site.identity.postcodes.includes(company.postcode ?? "-")) ? "confirmed" : "inferred";
      if (identityStatus === "confirmed" && locationStatus === "inferred" && site.identity.localityOnSite) locationStatus = "confirmed";
    } else if (site.websiteStatus === "conflict") {
      identityStatus = "conflict";
      await openConflict(db, company.id, "website", [{ value: websiteUrl, source_type: foundBySearch ? "web_search" : "listagem" }, { value: "site não menciona o nome nem o telefone", source_type: "website" }]);
    } else identityStatus = hasListing ? "inferred" : "unverified";
    // Telefones divergentes entre listagem e site: guardar divergência, não escolher automaticamente
    const sitePhones = site.contacts.filter((c) => c.kind === "phone").map((c) => c.valueNorm);
    if (company.phone_e164 && sitePhones.length && !sitePhones.includes(company.phone_e164))
      await openConflict(db, company.id, "phone", [{ value: company.phone_e164, source_type: "listagem" }, ...sitePhones.slice(0, 3).map((p) => ({ value: p, source_type: "website" }))]);
    const evMap = await insertEvidences(db, company.id, evidenceDrafts, ctx.searchId);
    await upsertContacts(db, company.id, site.contacts, evMap);
    await syncOpportunities(db, company.id, oppDrafts, evMap, analysisId, SITE_OPPORTUNITY_TYPES);
    if (foundBySearch && !company.locked_fields.includes("website"))
      await db.query("update companies set website_url = $2, domain = $3 where id = $1", [company.id, websiteUrl, companyDomain(websiteUrl)]);
  } else {
    if (!company.locked_fields.includes("identity")) identityStatus = company.google_place_id || company.osm_id ? "inferred" : "unverified";
    const evMap = await insertEvidences(db, company.id, evidenceDrafts, ctx.searchId);
    await syncOpportunities(db, company.id, oppDrafts, evMap, null, SITE_OPPORTUNITY_TYPES);
  }

  // Duas listagens independentes coincidentes (Google + OSM) também confirmam identidade
  if (identityStatus === "inferred" && company.google_place_id && company.osm_id) identityStatus = "confirmed";

  // 3) Nicho: tipos/etiquetas confirmam; IA só infere com evidência citada
  if (!company.locked_fields.includes("niche") && (company.niche_status !== "confirmed" || (ctx.mode === "agencies" && offersWebdev == null))) {
    const listing = await db.query<{ details: { types?: string[]; osmTags?: Record<string, string> } }>(
      "select details from evidences where company_id = $1 and field = 'listing' order by observed_at desc limit 2", [company.id]);
    const types = listing.rows.flatMap((r) => r.details?.types ?? []);
    const osmTags = Object.assign({}, ...listing.rows.map((r) => r.details?.osmTags ?? {}));
    const m = classifyNiche({ types, osmTags, name: company.name }, ctx.targetNiches);
    if (m && (company.niche_status === "unknown" || m.status === "confirmed")) {
      await db.query("update companies set niche = $2, niche_status = $3, is_agency = is_agency or $4 where id = $1", [company.id, m.key, m.status, !!nicheByKey(m.key)?.agency]);
    } else if (deps.ai?.configured() && company.niche_status === "unknown") {
      try {
        const evs = await db.query<{ id: string; field: string; value: string | null; source_type: string }>(
          "select id, field, value, source_type from evidences where company_id = $1 and superseded_at is null and field in ('listing','website','agency_webdev_offer') limit 20", [company.id]);
        const ai = await deps.ai.classify({ companyName: company.name, listingTypes: types, evidences: evs.rows.map((e) => ({ id: e.id, field: e.field, value: e.value, source: e.source_type })), untrustedPageText: pageSample }, deps.guard);
        if (ai?.nicheKey && ctx.targetNiches.includes(ai.nicheKey)) {
          await db.query(
            `insert into evidences (company_id, field, value, source_type, source_url, method, status, details, search_id) values ($1,'niche',$2,'ai',$3,$4,'inferred',$5,$6)`,
            [company.id, ai.nicheKey, company.website_url, `classificação sugerida por ${ai.model}, citando evidências`, JSON.stringify({ cited: ai.nicheEvidenceIds, summary: ai.summary }), ctx.searchId]);
          await db.query("update companies set niche = $2, niche_status = 'inferred' where id = $1 and niche_status = 'unknown'", [company.id, ai.nicheKey]);
        }
      } catch (e) { notes.push(`IA indisponível: ${(e as Error).message.slice(0, 150)}`); }
    }
  }

  const upd = await db.query<CompanyRow>(
    `update companies set website_status = case when 'website' = any(locked_fields) then website_status else $2 end,
       identity_status = case when 'identity' = any(locked_fields) then identity_status else $3 end,
       location_status = case when 'location' = any(locked_fields) then location_status else $4 end,
       distance_km = $5 where id = $1 returning *`,
    [company.id, websiteStatus, identityStatus, locationStatus, distance]);
  company = upd.rows[0];
  const score = await scoreCompany(db, company, ctx.rubric, ctx.rubricVersion, { targetNiches: ctx.targetNiches, mode: ctx.mode });
  return { company, score, notes };
}
