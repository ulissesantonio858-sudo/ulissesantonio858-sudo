import { withUser, type Db } from "../db";
import { haversineKm } from "../domain/geo";
import { classifyNiche, nicheByKey } from "../domain/niches";
import { normalizePhonePT, stripAccents } from "../domain/normalize";
import { SearchParamsSchema, type SearchParams } from "../domain/search-params";
import type { ContactDraft, EvidenceDraft } from "../analysis/types";
import type { SiteDeps } from "../analysis/site";
import { dbUsageGuard, getSettings } from "../settings";
import type { Providers } from "../providers/registry";
import { QuotaExceededError, type DiscoveryCandidate } from "../providers/types";
import { insertEvidences, logActivity, openConflict, upsertCompany, upsertContacts, type CompanyRow } from "./repo";
import { verifyCompany } from "./verify";

export interface RunOptions { providers: Providers; site?: SiteDeps; maxCandidateAttempts?: number }

type SourceLog = { provider: string; query: string; at: string; results: number; error?: string };

async function searchStatus(userId: string, searchId: string): Promise<string> {
  return withUser(userId, async (db) => (await db.query("select status from searches where id = $1", [searchId])).rows[0]?.status);
}

/**
 * Executa (ou retoma) uma pesquisa. Cada candidato é processado na sua própria transação,
 * pelo que um cancelamento ou falha a meio preserva o que já foi feito e a retoma não duplica registos.
 */
export async function runSearch(userId: string, searchId: string, opts: RunOptions): Promise<"completed" | "cancelled"> {
  const { search, settings } = await withUser(userId, async (db) => {
    const s = (await db.query("select * from searches where id = $1", [searchId])).rows[0];
    if (!s) throw new Error("pesquisa não encontrada");
    // Candidatos interrompidos numa execução anterior voltam à fila
    await db.query("update search_candidates set status = 'pending' where search_id = $1 and status = 'processing'", [searchId]);
    await db.query("update searches set status = 'running', started_at = coalesce(started_at, now()), error = null where id = $1 and status in ('queued','running')", [searchId]);
    return { search: s, settings: await getSettings(db) };
  });
  const params: SearchParams = SearchParamsSchema.parse(search.params);
  const guard = dbUsageGuard(userId, settings.limits);

  // Fase 1 — descoberta
  if (search.stage === "discovery") {
    const sources: SourceLog[] = [];
    let total = 0;
    outer: for (const nicheKey of params.niches) {
      const niche = nicheByKey(nicheKey)!;
      for (const provider of opts.providers.discovery.filter((p) => params.providers.includes(p.id))) {
        const queries = provider.id === "osm" ? [niche.label] : niche.queries.map((q) => `${q} em ${params.locality}`);
        for (const query of queries) {
          if (total >= params.maxCandidates) break outer;
          if ((await searchStatus(userId, searchId)) === "cancel_requested") break outer;
          const at = new Date().toISOString();
          if (!provider.configured()) { sources.push({ provider: provider.id, query, at, results: 0, error: "não configurado" }); continue; }
          try {
            const found = await provider.search({ query, nicheKey, center: params.center, radiusKm: params.radiusKm, maxResults: params.maxCandidates - total }, guard);
            const inserted = await withUser(userId, async (db) => {
              let n = 0;
              for (const c of found) {
                const r = await db.query(
                  `insert into search_candidates (search_id, source, external_id, name, payload) values ($1,$2,$3,$4,$5) on conflict do nothing`,
                  [searchId, c.source, c.externalId, c.name, JSON.stringify({ ...c, nicheKey })]);
                n += r.rowCount ?? 0;
              }
              return n;
            });
            total += inserted;
            sources.push({ provider: provider.id, query, at, results: found.length });
          } catch (e) {
            sources.push({ provider: provider.id, query, at, results: 0, error: (e as Error).message.slice(0, 300) });
            if (e instanceof QuotaExceededError) break;
          }
        }
      }
    }
    await withUser(userId, (db) => db.query("update searches set sources_consulted = sources_consulted || $2::jsonb, stage = 'processing' where id = $1", [searchId, JSON.stringify(sources)]));
  }

  // Fase 2 — verificação candidato a candidato
  while (true) {
    const status = await searchStatus(userId, searchId);
    if (status === "cancel_requested") {
      await withUser(userId, (db) => db.query("update searches set status = 'cancelled', finished_at = now() where id = $1", [searchId]));
      await refreshStats(userId, searchId);
      return "cancelled";
    }
    const cand = await withUser(userId, async (db) => (await db.query(
      `update search_candidates set status = 'processing', attempts = attempts + 1, updated_at = now()
        where id = (select id from search_candidates where search_id = $1 and status = 'pending' order by updated_at, id limit 1)
        returning *`, [searchId])).rows[0]);
    if (!cand) break;
    try {
      const outcome = await withUser(userId, (db) => processCandidate(db, searchId, cand.payload as DiscoveryCandidate & { nicheKey: string }, params, settings, opts, guard));
      await withUser(userId, (db) => db.query("update search_candidates set status = $2, outcome = $3, company_id = $4, error = null, updated_at = now() where id = $1",
        [cand.id, outcome.status, outcome.outcome, outcome.companyId]));
    } catch (e) {
      const msg = (e as Error).message.slice(0, 500);
      const max = opts.maxCandidateAttempts ?? 2;
      await withUser(userId, (db) => db.query("update search_candidates set status = case when attempts >= $3 then 'failed' else 'pending' end, error = $2, updated_at = now() where id = $1",
        [cand.id, msg, max]));
    }
    await refreshStats(userId, searchId);
  }
  await withUser(userId, (db) => db.query("update searches set status = 'completed', stage = 'done', finished_at = now() where id = $1 and status <> 'cancelled'", [searchId]));
  await refreshStats(userId, searchId);
  return "completed";
}

export async function refreshStats(userId: string, searchId: string) {
  await withUser(userId, (db) => db.query(
    `update searches s set stats = (
       select jsonb_build_object(
         'candidates', coalesce(sum(n), 0)::int,
         'by_status', coalesce(jsonb_object_agg(st, n) filter (where st is not null), '{}'::jsonb))
       from (select status st, count(*) n from search_candidates where search_id = s.id group by status) x
     ) || jsonb_build_object('by_qualification', coalesce((
       select jsonb_object_agg(q, n) from (select c.qualification_status q, count(distinct c.id) n from search_candidates sc join companies c on c.id = sc.company_id
         where sc.search_id = s.id and sc.status = 'done' group by c.qualification_status) y), '{}'::jsonb))
     where s.id = $1`, [searchId]));
}

async function processCandidate(db: Db, searchId: string, c: DiscoveryCandidate & { nicheKey: string }, params: SearchParams,
  settings: Awaited<ReturnType<typeof getSettings>>, opts: RunOptions, guard: ReturnType<typeof dbUsageGuard>) {
  // Filtros baratos antes da verificação completa (explicados no estado do candidato)
  const addr = stripAccents(`${c.address ?? ""} ${c.locality ?? ""}`.toLowerCase());
  if (params.excludeTerms.some((t) => addr.includes(stripAccents(t.toLowerCase()))))
    return { status: "skipped", outcome: `fora da região: morada contém "${params.excludeTerms.find((t) => addr.includes(stripAccents(t.toLowerCase())))}"`, companyId: null };
  const distance = c.lat != null && c.lng != null ? haversineKm(params.center, { lat: c.lat, lng: c.lng }) : null;
  if (distance != null && distance > params.radiusKm)
    return { status: "skipped", outcome: `fora do raio (${distance.toFixed(1)} km > ${params.radiusKm} km)`, companyId: null };
  if (c.businessStatus === "closed_permanently")
    return { status: "skipped", outcome: "encerrada permanentemente segundo a listagem", companyId: null };

  const niche = classifyNiche({ types: c.types, osmTags: c.osmTags, name: c.name }, params.niches) ?? { key: c.nicheKey, status: "inferred" as const, via: "consulta da pesquisa" };
  const isGoogle = c.source === "google_places";
  const expires = isGoogle ? new Date(Date.now() + settings.retentionDays * 86_400_000).toISOString() : null;
  const { company, decision, conflicts } = await upsertCompany(db, {
    name: c.name, address: c.address, locality: c.locality ?? params.locality, postcode: c.postcode, lat: c.lat, lng: c.lng, phone: c.phone,
    website: c.website, googlePlaceId: isGoogle ? c.externalId : null, osmId: c.source === "osm" ? c.externalId : null,
    niche: niche.key, nicheStatus: niche.status, isAgency: params.mode === "agencies" || !!nicheByKey(niche.key)?.agency,
    businessStatus: c.businessStatus, coordsExpireAt: expires, distanceKm: distance, searchId,
  }, c.source);

  // Evidências da listagem (conteúdo Google com prazo de retenção)
  const now = new Date().toISOString();
  const src = c.source;
  const evs: EvidenceDraft[] = [{
    key: "listing", field: "listing", value: c.name, sourceType: src, sourceUrl: c.mapsUrl, status: "confirmed", observedAt: now, expiresAt: expires,
    method: `${isGoogle ? "Google Places Text Search" : "OpenStreetMap Overpass"}: "${c.query}"; nicho ${niche.status === "confirmed" ? "confirmado" : "inferido"} por ${niche.via}`,
    details: { types: c.types, osmTags: c.osmTags, address: c.address, businessStatus: c.businessStatus, distanceKm: distance },
  }];
  const contacts: ContactDraft[] = [];
  const phone = normalizePhonePT(c.phone);
  if (phone) {
    evs.push({ key: "lphone", field: "phone", value: phone, sourceType: src, sourceUrl: c.mapsUrl, method: "telefone publicado na listagem (não indica WhatsApp)", status: "confirmed", observedAt: now, expiresAt: expires });
    contacts.push({ kind: "phone", value: phone, valueNorm: phone, status: "confirmed", evidenceKey: "lphone" });
  }
  if (c.website) evs.push({ key: "lsite", field: "website", value: c.website, sourceType: src, sourceUrl: c.mapsUrl, method: "site indicado na listagem", status: "inferred", observedAt: now, expiresAt: expires });
  if (c.businessStatus === "operational") evs.push({ key: "lop", field: "activity", value: "operational", sourceType: src, sourceUrl: c.mapsUrl, method: "estado do negócio na listagem: operacional", status: "confirmed", observedAt: now, expiresAt: expires, details: { kind: "operational_status" } });
  if (c.latestReviewAt) evs.push({ key: "lrev", field: "activity", value: c.latestReviewAt, sourceType: src, sourceUrl: c.mapsUrl, method: "data da avaliação mais recente devolvida pela listagem (texto não guardado)", status: "confirmed", observedAt: now, expiresAt: expires, details: { kind: "dated", label: "avaliação mais recente" } });
  const checkDate = c.osmTags?.check_date ?? c.osmTags?.["survey:date"];
  if (checkDate && !isNaN(Date.parse(checkDate))) evs.push({ key: "lchk", field: "activity", value: new Date(checkDate).toISOString(), sourceType: "osm", sourceUrl: c.mapsUrl, method: "check_date no OpenStreetMap (verificação no terreno por um contribuidor)", status: "confirmed", observedAt: now, details: { kind: "dated", label: "check_date OSM" } });
  if (c.osmTags) {
    for (const [tag, kind] of [["contact:instagram", "instagram"], ["contact:facebook", "facebook"]] as const) {
      const v = c.osmTags[tag];
      if (v && /^https:\/\//.test(v)) { evs.push({ key: `l${kind}`, field: kind, value: v, sourceType: "osm", sourceUrl: c.mapsUrl, method: `etiqueta ${tag} no OSM`, status: "inferred", observedAt: now }); contacts.push({ kind, value: v, valueNorm: v.toLowerCase(), status: "inferred", evidenceKey: `l${kind}` }); }
    }
  }
  if (c.businessStatus === "closed_temporarily") evs.push({ key: "lclosed", field: "business_status", value: "closed_temporarily", sourceType: src, sourceUrl: c.mapsUrl, method: "estado na listagem", status: "confirmed", observedAt: now, expiresAt: expires });
  const evMap = await insertEvidences(db, company.id, evs, searchId);
  await upsertContacts(db, company.id, contacts, evMap);
  for (const field of conflicts) {
    const cur = company[(field === "phone" ? "phone_e164" : field === "website" ? "website_url" : field) as keyof CompanyRow] as string | null;
    await openConflict(db, company.id, field, [{ value: cur, source_type: "registo existente" }, { value: field === "phone" ? phone : (c as unknown as Record<string, string | null>)[field] ?? null, evidence_id: evMap.get(field === "phone" ? "lphone" : "lsite") ?? null, source_type: src }]);
  }

  if (decision.kind === "match") {
    const already = await db.query("select 1 from search_candidates where search_id = $1 and company_id = $2 and status = 'done' limit 1", [searchId, company.id]);
    if (already.rowCount) return { status: "duplicate", outcome: `mesma empresa que outro candidato (${decision.reason})`, companyId: company.id };
  }
  if (company.pipeline_stage === "nao_contactar")
    return { status: "done", outcome: "empresa marcada «não contactar»: não reverificada", companyId: company.id };

  const result = await verifyCompany(db, company, {
    center: params.center, radiusKm: params.radiusKm, postcodePrefixes: params.postcodePrefixes, excludeTerms: params.excludeTerms,
    targetLocality: params.locality, targetNiches: params.niches, mode: params.mode, searchId, rubric: settings.rubric, rubricVersion: settings.rubricVersion,
  }, { webSearch: opts.providers.webSearch, ai: opts.providers.ai, guard, site: opts.site });
  if (decision.kind === "match") await logActivity(db, company.id, "system", `Reverificada na pesquisa ${searchId.slice(0, 8)} (${decision.reason}).`);
  const q = result.company.qualification_status;
  return { status: "done", outcome: `${q === "qualified" ? "qualificada" : q === "review" ? "para revisão" : "descartada"}: ${result.score.total} pts, confiança ${result.score.confidence}${result.notes.length ? " — " + result.notes.join("; ") : ""}`, companyId: company.id };
}
