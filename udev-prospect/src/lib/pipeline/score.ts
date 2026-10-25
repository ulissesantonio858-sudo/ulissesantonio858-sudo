import type { Db } from "../db";
import { NICHES, suggestService } from "../domain/niches";
import type { Rubric } from "../domain/rubric";
import { computeScore, type ActivityFact, type ContactFact, type OpportunityFact, type ScoreResult, type ScoringFacts } from "../domain/scoring";
import type { CompanyRow } from "./repo";

const KEY_FIELDS = ["website", "phone", "email", "identity", "location", "listing"];

/** Constrói os factos de pontuação exclusivamente a partir de evidências e estados gravados. */
export async function loadFacts(db: Db, company: CompanyRow, opts: { targetNiches: string[]; mode: "clients" | "agencies"; now?: Date }): Promise<ScoringFacts> {
  const now = opts.now ?? new Date();
  const ev = await db.query<{ id: string; field: string; value: string | null; source_type: string; status: string; observed_at: string; details: Record<string, unknown> }>(
    "select id, field, value, source_type, status, observed_at, details from evidences where company_id = $1 and superseded_at is null", [company.id]);
  const opps = await db.query<{ type: string; tier: OpportunityFact["tier"]; verification: OpportunityFact["verification"]; evidence_ids: string[]; observed: string }>(
    "select type, tier, verification, evidence_ids, observed from opportunities where company_id = $1 and status = 'open'", [company.id]);
  const contacts = await db.query<{ kind: string; status: ContactFact["status"]; value_norm: string; evidence_id: string | null; source_type: string | null }>(
    `select c.kind, c.status, c.value_norm, c.evidence_id, e.source_type from contacts c left join evidences e on e.id = c.evidence_id where c.company_id = $1`, [company.id]);
  const conflicts = await db.query<{ field: string }>("select field from conflicts where company_id = $1 and status = 'open'", [company.id]);

  const activity: ActivityFact[] = ev.rows.filter((e) => e.field === "activity").map((e) => {
    const kind = (e.details?.kind as string) ?? "dated";
    if (kind === "copyright_year") return { kind: "copyright_year" as const, date: null, source: `ano © ${e.value} no site`, evidenceId: e.id, current: e.details?.current };
    if (kind === "operational_status") return { kind: "operational_status" as const, date: null, source: `estado "operacional" em ${e.source_type}`, evidenceId: e.id };
    return { kind: "dated" as const, date: e.value, source: `${labelSource(e.source_type)}: ${(e.details?.label as string) ?? "registo datado"}`, evidenceId: e.id };
  }).filter((a) => a.kind !== "copyright_year" || (a as { current?: unknown }).current === true);

  // Um contacto é "cruzado" se o mesmo valor aparece em fontes diferentes
  const sourcesByValue = new Map<string, Set<string>>();
  for (const e of ev.rows) if (["phone", "email"].includes(e.field) && e.value) {
    if (!sourcesByValue.has(e.value)) sourcesByValue.set(e.value, new Set());
    sourcesByValue.get(e.value)!.add(e.source_type);
  }
  const contactFacts: ContactFact[] = contacts.rows.map((c) => ({
    kind: c.kind, status: c.status, onOfficialSite: c.source_type === "website" && company.website_status === "confirmed",
    crossConfirmed: (sourcesByValue.get(c.value_norm)?.size ?? 0) >= 2, evidenceId: c.evidence_id,
  }));

  const keyEv = ev.rows.filter((e) => KEY_FIELDS.includes(e.field));
  const independent = new Set(ev.rows.filter((e) => e.status === "confirmed" && !["ai", "manual"].includes(e.source_type)).map((e) => e.source_type === "playwright" ? "website" : e.source_type));
  const nicheDef = NICHES.find((n) => n.key === company.niche);
  return {
    mode: opts.mode,
    identity: company.identity_status as ScoringFacts["identity"],
    location: company.location_status as ScoringFacts["location"],
    businessStatus: company.business_status as ScoringFacts["businessStatus"],
    niche: { key: company.niche, status: company.niche_status, inTargetList: !!company.niche && opts.targetNiches.includes(company.niche) },
    isAgency: company.is_agency || !!nicheDef?.agency,
    agencyOffersWebdev: parseOffers(ev.rows.find((e) => e.field === "agency_webdev_offer")?.value),
    websiteStatus: company.website_status as ScoringFacts["websiteStatus"],
    opportunities: opps.rows.map((o) => ({ type: o.type, tier: o.tier, verification: o.verification, evidenceIds: o.evidence_ids, observed: o.observed })),
    activity,
    contacts: contactFacts,
    evidence: {
      independentSources: independent.size,
      newestObservedAt: maxDate(keyEv.map((e) => e.observed_at)),
      oldestKeyObservedAt: minDate(keyEv.map((e) => e.observed_at)),
      openConflicts: conflicts.rows,
      inconclusiveChecks: ev.rows.filter((e) => e.field === "website" && e.status === "unavailable").length,
    },
    now,
  };
}

function parseOffers(v: string | null | undefined): boolean | null {
  return v === "yes" ? true : v === "no" ? false : null;
}
function labelSource(s: string) {
  return ({ google_places: "Google Places", osm: "OpenStreetMap", website: "site oficial", web_search: "pesquisa web", playwright: "navegador", manual: "registo manual", csv_import: "importação CSV" } as Record<string, string>)[s] ?? s;
}
const maxDate = (a: string[]) => (a.length ? new Date(Math.max(...a.map((x) => new Date(x).getTime()))).toISOString() : null);
const minDate = (a: string[]) => (a.length ? new Date(Math.min(...a.map((x) => new Date(x).getTime()))).toISOString() : null);

/** Calcula e grava a pontuação atual; aplica correções manuais ativas por cima do resultado calculado. */
export async function scoreCompany(db: Db, company: CompanyRow, rubric: Rubric, rubricVersion: number, opts: { targetNiches: string[]; mode: "clients" | "agencies" }): Promise<ScoreResult> {
  const facts = await loadFacts(db, company, opts);
  const result = computeScore(facts, rubric);
  const ov = await db.query<{ field: string; new_value: string }>(
    "select distinct on (field) field, new_value from overrides where company_id = $1 and active order by field, created_at desc", [company.id]);
  const prio = ov.rows.find((o) => o.field === "priority")?.new_value as ScoreResult["priority"] | undefined;
  const qual = ov.rows.find((o) => o.field === "qualification_status")?.new_value as ScoreResult["qualification"] | undefined;

  await db.query("update scores set is_current = false where company_id = $1 and is_current", [company.id]);
  await db.query(
    `insert into scores (company_id, rubric_version, total, breakdown, confidence, confidence_reasons, priority, priority_gaps)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [company.id, rubricVersion, result.total, JSON.stringify({ criteria: result.criteria, computedPriority: result.priority, manualPriority: prio ?? null }),
      result.confidence, result.confidenceReasons, prio ?? result.priority, result.priorityGaps]);
  const best = facts.opportunities.slice().sort((a, b) => tierRank(a.tier) - tierRank(b.tier))[0];
  const finalQual = qual ?? result.qualification;
  let stage = company.pipeline_stage;
  if (stage === "novo" || stage === "em_verificacao") stage = finalQual === "qualified" ? "qualificado" : "em_verificacao";
  await db.query(
    `update companies set qualification_status = $2, qualification_reasons = $3, suggested_service = $4, pipeline_stage = $5, last_verified_at = now() where id = $1`,
    [company.id, finalQual, result.qualificationReasons, suggestService(best?.type ?? null, facts.isAgency), stage]);
  return result;
}

function tierRank(t: string) {
  return ({ principal: 0, obstacle: 1, not_located: 2, minor: 3 } as Record<string, number>)[t] ?? 9;
}
