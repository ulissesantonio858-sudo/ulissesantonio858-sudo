import Papa from "papaparse";
import type { Db } from "./db";
import { buildDrafts, DoNotContactError, type Draft } from "./domain/outreach";
import { normalizeEmail, normalizePhonePT, normalizeUrl } from "./domain/normalize";
import { NICHES } from "./domain/niches";
import { todayLisbon } from "./domain/time";
import { getSettings } from "./settings";
import { insertEvidences, logActivity, upsertCompany, upsertContacts, type CompanyRow } from "./pipeline/repo";
import type { ContactDraft, EvidenceDraft } from "./analysis/types";
import { scoreCompany } from "./pipeline/score";

export const STAGES = [
  ["novo", "Novo"], ["em_verificacao", "Em verificação"], ["qualificado", "Qualificado"], ["contacto_feito", "Contacto feito"],
  ["respondeu", "Respondeu"], ["reuniao_marcada", "Reunião marcada"], ["proposta_enviada", "Proposta enviada"], ["ganho", "Ganho"],
  ["perdido", "Perdido"], ["nao_contactar", "Não contactar"],
] as const;
export type Stage = (typeof STAGES)[number][0];
export const stageLabel = (s: string) => STAGES.find(([k]) => k === s)?.[1] ?? s;

export async function setStage(db: Db, companyId: string, stage: Stage, reason?: string) {
  const cur = (await db.query<{ pipeline_stage: string }>("select pipeline_stage from companies where id = $1", [companyId])).rows[0];
  if (!cur) throw new Error("empresa não encontrada");
  if (cur.pipeline_stage === stage) return;
  if (stage === "contacto_feito") throw new Error("Use «registar contacto» para marcar contacto feito (exige confirmação).");
  await db.query("update companies set pipeline_stage = $2 where id = $1", [companyId, stage]);
  await logActivity(db, companyId, "stage_change", `Etapa: ${stageLabel(cur.pipeline_stage)} → ${stageLabel(stage)}${reason ? ` (${reason})` : ""}`, stage);
  if (stage === "nao_contactar") await db.query("delete from drafts where company_id = $1", [companyId]);
}

/** Regista um contacto feito pelo utilizador. Só é chamado depois de confirmação explícita na interface. */
export async function logContact(db: Db, companyId: string, input: { channel: string; summary: string; occurredAt?: string; confirmed: boolean }) {
  if (!input.confirmed) throw new Error("É necessário confirmar que o contacto foi efetivamente feito.");
  const cur = (await db.query<{ pipeline_stage: string }>("select pipeline_stage from companies where id = $1", [companyId])).rows[0];
  if (!cur) throw new Error("empresa não encontrada");
  if (cur.pipeline_stage === "nao_contactar") throw new DoNotContactError();
  await logActivity(db, companyId, "contact_logged", input.summary || "Contacto registado", input.channel, input.occurredAt);
  if (["novo", "em_verificacao", "qualificado"].includes(cur.pipeline_stage)) {
    await db.query("update companies set pipeline_stage = 'contacto_feito' where id = $1", [companyId]);
    await logActivity(db, companyId, "stage_change", `Etapa: ${stageLabel(cur.pipeline_stage)} → Contacto feito`, "contacto_feito");
  }
}

/** Gera (ou regenera) rascunhos a partir da melhor oportunidade com evidência. Rascunhos editados não são substituídos. */
export async function generateDrafts(db: Db, companyId: string, opts: { opportunityId?: string } = {}): Promise<Draft[]> {
  const c = (await db.query<CompanyRow>("select * from companies where id = $1", [companyId])).rows[0];
  if (!c) throw new Error("empresa não encontrada");
  if (c.pipeline_stage === "nao_contactar") throw new DoNotContactError();
  const settings = await getSettings(db);
  const opp = (await db.query<{ id: string; type: string; observed: string; evidence_ids: string[]; created_at: string; tier: string }>(
    `select id, type, observed, evidence_ids, created_at, tier from opportunities where company_id = $1 and status = 'open' and cardinality(evidence_ids) > 0
       and ($2::uuid is null or id = $2)
     order by case tier when 'principal' then 0 when 'obstacle' then 1 when 'not_located' then 2 else 3 end, created_at desc limit 1`,
    [companyId, opts.opportunityId ?? null])).rows[0];
  let opportunity = null;
  if (opp) {
    const ev = (await db.query<{ source_url: string | null; observed_at: string; value: string | null }>("select source_url, observed_at, value from evidences where id = $1", [opp.evidence_ids[0]])).rows[0];
    opportunity = { type: opp.type, observed: opp.observed, evidenceIds: opp.evidence_ids, sourceUrl: ev?.source_url ?? null, verifiedAt: ev?.observed_at ?? opp.created_at,
      ctaText: opp.type === "cta_wrong_destination" ? (ev?.value ?? "").split(" → ")[0] || null : null };
  } else if (c.is_agency) {
    const ev = (await db.query<{ id: string; observed_at: string; source_url: string | null }>(
      "select id, observed_at, source_url from evidences where company_id = $1 and field = 'agency_webdev_offer' and superseded_at is null order by observed_at desc limit 1", [companyId])).rows[0];
    if (ev) opportunity = { type: "manual_note", observed: "não vi referência a desenvolvimento de sites nos serviços apresentados", evidenceIds: [ev.id], sourceUrl: ev.source_url, verifiedAt: ev.observed_at };
  }
  const logged = (await db.query("select count(*)::int n from activities where company_id = $1 and type = 'contact_logged'", [companyId])).rows[0].n;
  const drafts = buildDrafts({ companyName: c.name, isAgency: c.is_agency, pipelineStage: c.pipeline_stage, opportunity, followups: settings.outreach.followups,
    senderName: settings.outreach.senderName, loggedContacts: logged });
  await db.query("delete from drafts where company_id = $1 and not edited and channel <> all($2)", [companyId, drafts.map((d) => d.channel)]);
  for (const d of drafts)
    await db.query(
      `insert into drafts (company_id, channel, subject, body, evidence_ids, generated_by) values ($1,$2,$3,$4,$5,'template')
       on conflict (company_id, channel) do update set subject = excluded.subject, body = excluded.body, evidence_ids = excluded.evidence_ids,
         generated_by = 'template', updated_at = now() where not drafts.edited`,
      [companyId, d.channel, d.subject, d.body, d.evidenceIds]);
  return drafts;
}

export async function saveDraft(db: Db, companyId: string, channel: string, subject: string | null, body: string) {
  const c = (await db.query<{ pipeline_stage: string }>("select pipeline_stage from companies where id = $1", [companyId])).rows[0];
  if (c?.pipeline_stage === "nao_contactar") throw new DoNotContactError();
  await db.query("update drafts set subject = $3, body = $4, edited = true, updated_at = now() where company_id = $1 and channel = $2", [companyId, channel, subject, body]);
}

export async function addOverride(db: Db, companyId: string, field: string, newValue: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new Error("Indique o motivo da correção.");
  const col = field === "priority" ? null : field;
  let old: string | null = null;
  if (col) old = (await db.query(`select ${col}::text v from companies where id = $1`, [companyId])).rows[0]?.v ?? null;
  else old = (await db.query("select priority v from scores where company_id = $1 and is_current", [companyId])).rows[0]?.v ?? null;
  await db.query("update overrides set active = false where company_id = $1 and field = $2 and active", [companyId, field]);
  await db.query("insert into overrides (company_id, field, old_value, new_value, reason) values ($1,$2,$3,$4,$5)", [companyId, field, old, newValue, reason.trim()]);
  if (["niche", "website_status", "identity_status", "location_status"].includes(field)) {
    const lockName = field === "website_status" ? "website" : field === "identity_status" ? "identity" : field === "location_status" ? "location" : "niche";
    await db.query(`update companies set ${field} = $2, locked_fields = array(select distinct unnest(locked_fields || $3::text[])) ${field === "niche" ? ", niche_status = 'confirmed'" : ""} where id = $1`, [companyId, newValue, [lockName]]);
  }
  await logActivity(db, companyId, "override", `Correção manual de ${field}: ${old ?? "—"} → ${newValue}. Motivo: ${reason.trim()}`);
  await rescore(db, companyId);
}

export async function rescore(db: Db, companyId: string) {
  const c = (await db.query<CompanyRow>("select * from companies where id = $1", [companyId])).rows[0];
  const settings = await getSettings(db);
  const p = c.first_search_id ? (await db.query("select params from searches where id = $1", [c.first_search_id])).rows[0]?.params : null;
  return scoreCompany(db, c, settings.rubric, settings.rubricVersion, { targetNiches: p?.niches ?? NICHES.map((n) => n.key), mode: c.is_agency ? "agencies" : "clients" });
}

export async function resolveConflict(db: Db, conflictId: string, value: string, reason: string) {
  const cf = (await db.query<{ company_id: string; field: string }>("update conflicts set status = 'resolved', resolved_value = $2, resolution_reason = $3, resolved_at = now() where id = $1 and status = 'open' returning company_id, field",
    [conflictId, value, reason])).rows[0];
  if (!cf) throw new Error("conflito não encontrado");
  const map: Record<string, string> = { phone: "phone_e164", website: "website_url", address: "address", locality: "locality", postcode: "postcode" };
  if (map[cf.field]) {
    const v = cf.field === "phone" ? normalizePhonePT(value) ?? value : value;
    await db.query(`update companies set ${map[cf.field]} = $2, locked_fields = array(select distinct unnest(locked_fields || $3::text[])) where id = $1`, [cf.company_id, v, [cf.field]]);
  }
  if (cf.field === "website" && /não menciona|nao menciona/i.test(value) === false)
    await db.query("update companies set identity_status = case when identity_status = 'conflict' then 'inferred' else identity_status end where id = $1", [cf.company_id]);
  await logActivity(db, cf.company_id, "conflict_resolved", `Divergência em ${cf.field} resolvida: ${value}. Motivo: ${reason}`);
  await rescore(db, cf.company_id);
}

export async function saveQualityReview(db: Db, companyId: string, input: { adequate: boolean; discardReason?: string | null; searchError?: string | null }) {
  await db.query(
    `insert into quality_reviews (company_id, adequate, discard_reason, search_error) values ($1,$2,$3,$4)
     on conflict (company_id) do update set adequate = excluded.adequate, discard_reason = excluded.discard_reason, search_error = excluded.search_error, reviewed_at = now()`,
    [companyId, input.adequate, input.discardReason || null, input.searchError || null]);
  await logActivity(db, companyId, "quality_review", `Revisão de qualidade: ${input.adequate ? "adequado" : "não adequado"}${input.discardReason ? ` — ${input.discardReason}` : ""}`);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "empresa"], niche: ["nicho", "niche", "categoria"], address: ["morada", "address", "endereco", "endereço"],
  locality: ["localidade", "locality", "cidade"], postcode: ["codigo_postal", "código postal", "codigo postal", "postcode", "cp"],
  phone: ["telefone", "phone", "telemovel", "telemóvel"], email: ["email", "e-mail"], website: ["website", "site", "url"],
  instagram: ["instagram"], facebook: ["facebook"], notes: ["notas", "notes", "observacoes", "observações"], place_id: ["place_id", "google_place_id"],
  lat: ["latitude", "lat"], lng: ["longitude", "lng", "lon"],
};

function mapHeader(h: string): string | null {
  const n = h.trim().toLowerCase();
  for (const [k, aliases] of Object.entries(HEADER_ALIASES)) if (aliases.includes(n)) return k;
  return null;
}

export interface ImportSummary { rows: number; created: number; matched: number; branches: number; notesAdded: number; errors: { line: number; error: string }[] }

/** Importa empresas sem duplicar e sem apagar notas. Dados importados ficam "inferidos" até verificação. */
export async function importCsv(db: Db, csvText: string, fileName: string): Promise<ImportSummary> {
  if (csvText.length > 2_000_000) throw new Error("Ficheiro demasiado grande (máx. 2 MB).");
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^﻿/, ""), { header: true, skipEmptyLines: true, transformHeader: (h) => mapHeader(h) ?? `_${h}` });
  const sum: ImportSummary = { rows: parsed.data.length, created: 0, matched: 0, branches: 0, notesAdded: 0, errors: [] };
  if (parsed.data.length > 2000) throw new Error("Máximo de 2000 linhas por importação.");
  let line = 1;
  for (const row of parsed.data) {
    line++;
    try {
      const name = (row.name ?? "").trim();
      if (!name) { sum.errors.push({ line, error: "nome em falta" }); continue; }
      const nicheKey = NICHES.find((n) => n.key === row.niche?.trim() || n.label.toLowerCase() === row.niche?.trim().toLowerCase())?.key ?? null;
      const lat = row.lat ? Number(row.lat.replace(",", ".")) : null;
      const lng = row.lng ? Number(row.lng.replace(",", ".")) : null;
      await db.query("savepoint row_sp");
      const { company, decision } = await upsertCompany(db, {
        name, address: row.address || null, locality: row.locality || null, postcode: row.postcode || null,
        lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, phone: row.phone || null, website: row.website || null,
        googlePlaceId: row.place_id || null, niche: nicheKey, nicheStatus: nicheKey ? "inferred" : "unknown", isAgency: nicheKey === "agencia_marketing",
      }, `importação CSV (${fileName})`);
      if (decision.kind === "match") sum.matched++; else { sum.created++; if (decision.kind === "branch") sum.branches++; }
      const now = new Date().toISOString();
      const method = `importado de CSV «${fileName}», linha ${line} (não verificado)`;
      const evs: EvidenceDraft[] = [];
      const contacts: ContactDraft[] = [];
      const phone = normalizePhonePT(row.phone);
      if (phone) { evs.push({ key: "p", field: "phone", value: phone, sourceType: "csv_import", sourceUrl: null, method, status: "inferred", observedAt: now }); contacts.push({ kind: "phone", value: phone, valueNorm: phone, status: "inferred", evidenceKey: "p" }); }
      const email = row.email ? normalizeEmail(row.email) : null;
      if (email) { evs.push({ key: "e", field: "email", value: email, sourceType: "csv_import", sourceUrl: null, method, status: "inferred", observedAt: now }); contacts.push({ kind: "email", value: email, valueNorm: email, status: "inferred", evidenceKey: "e" }); }
      for (const kind of ["instagram", "facebook"] as const) {
        const u = normalizeUrl(row[kind]);
        if (u) { evs.push({ key: kind, field: kind, value: u, sourceType: "csv_import", sourceUrl: u, method, status: "inferred", observedAt: now }); contacts.push({ kind, value: u, valueNorm: u.toLowerCase().replace(/\/$/, ""), status: "inferred", evidenceKey: kind }); }
      }
      const site = normalizeUrl(row.website);
      if (site) evs.push({ key: "w", field: "website", value: site, sourceType: "csv_import", sourceUrl: site, method, status: "inferred", observedAt: now });
      // Evitar evidências repetidas em reimportações do mesmo ficheiro
      const already = await db.query("select 1 from evidences where company_id = $1 and source_type = 'csv_import' and method = $2 limit 1", [company.id, method]);
      if (!already.rowCount) {
        const evMap = await insertEvidences(db, company.id, evs, null);
        await upsertContacts(db, company.id, contacts, evMap);
      }
      const note = (row.notes ?? "").trim();
      if (note) {
        const dup = await db.query("select 1 from activities where company_id = $1 and type = 'note' and body = $2 limit 1", [company.id, note]);
        if (!dup.rowCount) { await logActivity(db, company.id, "note", note); sum.notesAdded++; }
      }
      await db.query("release savepoint row_sp");
    } catch (e) {
      await db.query("rollback to savepoint row_sp").catch(() => {});
      sum.errors.push({ line, error: (e as Error).message.slice(0, 200) });
    }
  }
  return sum;
}

export async function exportCsv(db: Db): Promise<string> {
  const { rows } = await db.query(
    `select c.name as nome, c.niche as nicho, c.locality as localidade, c.address as morada, c.postcode as codigo_postal, c.website_url as website,
       c.website_status as estado_site, c.phone_e164 as telefone,
       (select string_agg(value, ' ') from contacts ct where ct.company_id = c.id and ct.kind = 'email') as email,
       c.pipeline_stage as etapa, c.qualification_status as qualificacao, s.total as score, s.confidence as confianca, s.priority as prioridade,
       c.identity_status as identidade, c.location_status as localizacao, c.google_place_id as place_id, c.last_verified_at as ultima_verificacao
     from companies c left join scores s on s.company_id = c.id and s.is_current order by c.name`);
  return Papa.unparse(rows);
}

// ---------------------------------------------------------------------------
// Indicadores (calculados apenas sobre dados registados)
// ---------------------------------------------------------------------------
const FUNNEL: Stage[] = ["contacto_feito", "respondeu", "reuniao_marcada", "proposta_enviada", "ganho"];

export async function dashboardMetrics(db: Db) {
  const base = (await db.query(
    `select count(*) filter (where last_verified_at is not null)::int analisados,
            count(*) filter (where qualification_status = 'qualified')::int qualificados,
            count(*)::int total from companies`)).rows[0];
  const reached: Record<string, number> = {};
  for (let i = 0; i < FUNNEL.length; i++) {
    const later = FUNNEL.slice(i);
    reached[FUNNEL[i]] = (await db.query(
      `select count(distinct c.id)::int n from companies c where c.pipeline_stage = any($1)
         or exists (select 1 from activities a where a.company_id = c.id and a.type = 'stage_change' and a.channel = any($1))
         ${FUNNEL[i] === "contacto_feito" ? "or exists (select 1 from activities a where a.company_id = c.id and a.type = 'contact_logged')" : ""}`, [later])).rows[0].n;
  }
  const q = (await db.query(
    `select count(*)::int revistos, count(*) filter (where adequate)::int adequados,
       (select count(*)::int from companies where qualification_status = 'qualified') - count(*) filter (where c.qualification_status = 'qualified')::int as por_rever
     from quality_reviews r join companies c on c.id = r.company_id`)).rows[0];
  const reasons = (await db.query("select discard_reason r, count(*)::int n from quality_reviews where not adequate and discard_reason is not null group by 1 order by 2 desc limit 5")).rows;
  const errors = (await db.query("select search_error e, count(*)::int n from quality_reviews where search_error is not null group by 1 order by 2 desc limit 5")).rows;
  return { ...base, reached, quality: { ...q, porRever: Math.max(0, q.por_rever), reasons, errors } };
}

export async function tasksForDay(db: Db, day = todayLisbon()) {
  return (await db.query(
    `select t.*, c.name company_name from tasks t left join companies c on c.id = t.company_id
     where t.done_at is null and t.due_date <= $1 order by t.due_date, t.due_time nulls last`, [day])).rows;
}
