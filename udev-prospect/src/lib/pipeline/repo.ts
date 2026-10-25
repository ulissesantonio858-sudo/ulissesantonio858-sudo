import type { Db } from "../db";
import { decideDedup, type CompanyIdentity, type DedupDecision } from "../domain/dedup";
import { companyDomain, normalizeLocality, normalizeName, normalizePhonePT, normalizeUrl } from "../domain/normalize";
import type { ContactDraft, EvidenceDraft, OpportunityDraft } from "../analysis/types";

export interface CompanyRow {
  id: string;
  owner_id: string;
  name: string;
  name_norm: string;
  niche: string | null;
  niche_status: "confirmed" | "inferred" | "unknown";
  is_agency: boolean;
  address: string | null;
  locality: string | null;
  locality_norm: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  website_url: string | null;
  domain: string | null;
  website_status: string;
  phone_e164: string | null;
  google_place_id: string | null;
  osm_id: string | null;
  identity_status: string;
  location_status: string;
  business_status: string;
  qualification_status: string;
  qualification_reasons: string[];
  pipeline_stage: string;
  suggested_service: string | null;
  locked_fields: string[];
  group_key: string | null;
  first_search_id: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Dados de entrada de uma empresa vinda de uma listagem, importação ou cadastro manual. */
export interface CompanyInput {
  name: string;
  address?: string | null;
  locality?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  googlePlaceId?: string | null;
  osmId?: string | null;
  niche?: string | null;
  nicheStatus?: "confirmed" | "inferred" | "unknown";
  isAgency?: boolean;
  businessStatus?: CompanyRow["business_status"];
  coordsExpireAt?: string | null;
  distanceKm?: number | null;
  searchId?: string | null;
}

export function identityOf(input: CompanyInput): CompanyIdentity {
  return {
    googlePlaceId: input.googlePlaceId ?? null,
    osmId: input.osmId ?? null,
    domain: companyDomain(input.website),
    phone: normalizePhonePT(input.phone),
    nameNorm: normalizeName(input.name),
    localityNorm: normalizeLocality(input.locality),
    postcode: input.postcode ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
  };
}

function rowIdentity(r: CompanyRow): CompanyIdentity {
  return { id: r.id, googlePlaceId: r.google_place_id, osmId: r.osm_id, domain: r.domain, phone: r.phone_e164, nameNorm: r.name_norm,
    localityNorm: r.locality_norm, postcode: r.postcode, lat: r.lat, lng: r.lng, groupKey: r.group_key };
}

export async function findDedupCandidates(db: Db, id: CompanyIdentity): Promise<CompanyRow[]> {
  const { rows } = await db.query<CompanyRow>(
    `select * from companies where
       ($1::text is not null and google_place_id = $1) or ($2::text is not null and osm_id = $2) or
       ($3::text is not null and domain = $3) or ($4::text is not null and phone_e164 = $4) or name_norm = $5
     limit 50`,
    [id.googlePlaceId, id.osmId, id.domain, id.phone, id.nameNorm]);
  return rows;
}

const FIELD_MAP: Record<string, keyof CompanyRow> = {
  address: "address", locality: "locality", postcode: "postcode", phone: "phone_e164", website: "website_url", niche: "niche",
};

/**
 * Cria ou atualiza uma empresa sem duplicar e sem apagar trabalho manual:
 * - campos em locked_fields nunca são sobrescritos;
 * - campos já preenchidos não são substituídos por valores de outra fonte (a divergência fica registada como conflito);
 * - notas, atividades e etapa do pipeline nunca são tocadas aqui.
 */
export async function upsertCompany(db: Db, input: CompanyInput, sourceType: string): Promise<{ company: CompanyRow; decision: DedupDecision; conflicts: string[] }> {
  const ident = identityOf(input);
  const existing = await findDedupCandidates(db, ident);
  const decision = decideDedup(ident, existing.map(rowIdentity));
  const website = normalizeUrl(input.website);
  const phone = ident.phone;
  const conflicts: string[] = [];

  if (decision.kind === "match") {
    const cur = existing.find((e) => e.id === decision.companyId)!;
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    const incoming: Record<string, unknown> = { address: input.address, locality: input.locality, postcode: input.postcode, phone, website, niche: input.niche };
    for (const [field, value] of Object.entries(incoming)) {
      const col = FIELD_MAP[field];
      if (value == null || value === "" || cur.locked_fields.includes(field)) continue;
      const curVal = cur[col];
      if (curVal == null || curVal === "") {
        set(col as string, value);
        if (field === "website") set("domain", companyDomain(website));
        if (field === "locality") set("locality_norm", normalizeLocality(input.locality));
      } else if (String(curVal) !== String(value) && field !== "niche" && field !== "address") {
        const cmpA = field === "website" ? companyDomain(String(curVal)) : String(curVal);
        const cmpB = field === "website" ? companyDomain(String(value)) : String(value);
        if (cmpA !== cmpB) conflicts.push(field);
      }
    }
    if (input.googlePlaceId && !cur.google_place_id) set("google_place_id", input.googlePlaceId);
    if (input.osmId && !cur.osm_id) set("osm_id", input.osmId);
    if (input.lat != null && cur.lat == null && !cur.locked_fields.includes("location")) { set("lat", input.lat); set("lng", input.lng); set("coords_expire_at", input.coordsExpireAt ?? null); }
    if (input.distanceKm != null && cur.distance_km == null) set("distance_km", input.distanceKm);
    if (input.nicheStatus === "confirmed" && cur.niche_status !== "confirmed" && !cur.locked_fields.includes("niche") && input.niche) { set("niche", input.niche); set("niche_status", "confirmed"); }
    if (input.businessStatus && input.businessStatus !== "unknown" && !cur.locked_fields.includes("business_status")) set("business_status", input.businessStatus);
    if (input.isAgency && !cur.is_agency) set("is_agency", true);
    let company = cur;
    if (sets.length) {
      vals.push(cur.id);
      const { rows } = await db.query<CompanyRow>(`update companies set ${sets.join(", ")} where id = $${vals.length} returning *`, vals);
      company = rows[0];
    }
    return { company, decision, conflicts };
  }

  const groupKey = decision.kind === "branch" ? decision.groupKey : null;
  if (decision.kind === "branch")
    await db.query("update companies set group_key = coalesce(group_key, $1) where id = $2", [groupKey, decision.relatedCompanyId]);
  const { rows } = await db.query<CompanyRow>(
    `insert into companies (name, name_norm, niche, niche_status, is_agency, address, locality, locality_norm, postcode, lat, lng, coords_expire_at,
       distance_km, website_url, domain, phone_e164, google_place_id, osm_id, business_status, group_key, first_search_id, pipeline_stage)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'novo') returning *`,
    [input.name.trim(), ident.nameNorm, input.niche ?? null, input.nicheStatus ?? (input.niche ? "inferred" : "unknown"), !!input.isAgency,
      input.address ?? null, input.locality ?? null, ident.localityNorm, input.postcode ?? null, input.lat ?? null, input.lng ?? null,
      input.coordsExpireAt ?? null, input.distanceKm ?? null, website, companyDomain(website), phone, input.googlePlaceId ?? null,
      input.osmId ?? null, input.businessStatus ?? "unknown", groupKey, input.searchId ?? null]);
  await db.query("insert into activities (company_id, type, body) values ($1, 'system', $2)",
    [rows[0].id, `Registo criado a partir de ${sourceType}${decision.kind === "branch" ? ` (${decision.reason})` : ""}.`]);
  return { company: rows[0], decision, conflicts };
}

export async function insertEvidences(db: Db, companyId: string, drafts: EvidenceDraft[], searchId: string | null): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const d of drafts) {
    const { rows } = await db.query<{ id: string }>(
      `insert into evidences (company_id, field, value, source_type, source_url, method, status, observed_at, expires_at, details, search_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [companyId, d.field, d.value, d.sourceType, d.sourceUrl, d.method, d.status, d.observedAt, d.expiresAt ?? null, JSON.stringify(d.details ?? {}), searchId]);
    map.set(d.key, rows[0].id);
  }
  return map;
}

/** Marca evidências antigas de um campo/fonte como substituídas (mantém o histórico). */
export async function supersedeEvidence(db: Db, companyId: string, sourceTypes: string[], fieldPrefixes: string[]) {
  await db.query(
    `update evidences set superseded_at = now() where company_id = $1 and superseded_at is null and source_type = any($2)
       and exists (select 1 from unnest($3::text[]) p where field like p || '%')`, [companyId, sourceTypes, fieldPrefixes]);
}

export async function upsertContacts(db: Db, companyId: string, contacts: ContactDraft[], evMap: Map<string, string>) {
  for (const c of contacts) {
    await db.query(
      `insert into contacts (company_id, kind, value, value_norm, status, evidence_id, note) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (company_id, kind, value_norm) do update set
         status = case when contacts.status = 'confirmed' then contacts.status else excluded.status end,
         evidence_id = coalesce(excluded.evidence_id, contacts.evidence_id)`,
      [companyId, c.kind, c.value, c.valueNorm, c.status, evMap.get(c.evidenceKey) ?? null, c.note ?? null]);
  }
}

/** Atualiza as oportunidades de uma fonte: as observadas ficam abertas; as não reobservadas passam a resolvidas. */
export async function syncOpportunities(db: Db, companyId: string, drafts: OpportunityDraft[], evMap: Map<string, string>, analysisId: string | null, managedTypes: string[]) {
  const seen = new Set<string>();
  for (const o of drafts) {
    seen.add(o.type);
    const ids = o.evidenceKeys.map((k) => evMap.get(k)).filter(Boolean);
    await db.query(
      `insert into opportunities (company_id, analysis_id, type, tier, observed, possible_impact, suggested_improvement, verification, evidence_ids, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open')
       on conflict (company_id, type) do update set analysis_id = excluded.analysis_id, tier = excluded.tier, observed = excluded.observed,
         possible_impact = excluded.possible_impact, suggested_improvement = excluded.suggested_improvement, verification = excluded.verification,
         evidence_ids = excluded.evidence_ids, status = case when opportunities.status = 'dismissed' then 'dismissed' else 'open' end`,
      [companyId, analysisId, o.type, o.tier, o.observed, o.possibleImpact, o.suggestedImprovement, o.verification, ids]);
  }
  const stale = managedTypes.filter((t) => !seen.has(t));
  if (stale.length)
    await db.query("update opportunities set status = 'resolved' where company_id = $1 and status = 'open' and type = any($2)", [companyId, stale]);
}

export async function openConflict(db: Db, companyId: string, field: string, candidates: { value: string | null; evidence_id?: string | null; source_type: string }[]) {
  await db.query(
    `insert into conflicts (company_id, field, candidates) values ($1,$2,$3)
     on conflict (company_id, field) where status = 'open' do update set candidates = excluded.candidates`,
    [companyId, field, JSON.stringify(candidates)]);
}

export async function logActivity(db: Db, companyId: string, type: string, body: string, channel: string | null = null, occurredAt?: string) {
  await db.query("insert into activities (company_id, type, body, channel, occurred_at) values ($1,$2,$3,$4,coalesce($5::timestamptz, now()))",
    [companyId, type, body, channel, occurredAt ?? null]);
}
