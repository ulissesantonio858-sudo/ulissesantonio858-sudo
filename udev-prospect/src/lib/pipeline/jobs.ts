import os from "node:os";
import { withService, withUser, type Db } from "../db";
import { LOCATION_PRESETS } from "../domain/geo";
import { NICHES } from "../domain/niches";
import { SearchParamsSchema, type SearchParams } from "../domain/search-params";
import { getProviders, type Providers } from "../providers/registry";
import { dbUsageGuard, getSettings } from "../settings";
import type { CompanyRow } from "./repo";
import { runSearch, type RunOptions } from "./search-job";
import { verifyCompany } from "./verify";

export const WORKER_ID = `${os.hostname()}:${process.pid}`;

export async function enqueueJob(db: Db, type: "search" | "reverify" | "purge_expired", refId: string | null) {
  await db.query(
    `insert into jobs (type, ref_id) values ($1, $2)
     on conflict (type, ref_id) where status in ('queued','running') do nothing`, [type, refId]);
}

/** Parâmetros por defeito para reverificar uma empresa fora de uma pesquisa (última pesquisa que a encontrou, ou Vila Real). */
async function paramsForCompany(db: Db, company: CompanyRow): Promise<SearchParams> {
  if (company.first_search_id) {
    const s = await db.query("select params from searches where id = $1", [company.first_search_id]);
    const p = SearchParamsSchema.safeParse(s.rows[0]?.params);
    if (p.success) return p.data;
  }
  const vr = LOCATION_PRESETS[0];
  return { locationKey: vr.key, locality: vr.locality, center: vr.center, centerLabel: vr.label, postcodePrefixes: vr.postcodePrefixes, excludeTerms: vr.excludeTerms,
    radiusKm: 15, niches: NICHES.map((n) => n.key), opportunityTypes: ["site_errors", "contact_path", "not_located", "minor"], mode: company.is_agency ? "agencies" : "clients",
    maxCandidates: 1, providers: ["google_places", "osm"] };
}

export async function reverifyCompany(userId: string, companyId: string, providers: Providers, opts: Pick<RunOptions, "site"> = {}) {
  return withUser(userId, async (db) => {
    const company = (await db.query<CompanyRow & { first_search_id: string | null }>("select * from companies where id = $1", [companyId])).rows[0];
    if (!company) throw new Error("empresa não encontrada");
    const p = await paramsForCompany(db, company);
    const settings = await getSettings(db);
    return verifyCompany(db, company, { center: p.center, radiusKm: p.radiusKm, postcodePrefixes: p.postcodePrefixes, excludeTerms: p.excludeTerms,
      targetLocality: p.locality, targetNiches: p.niches, mode: p.mode, searchId: null, rubric: settings.rubric, rubricVersion: settings.rubricVersion },
      { webSearch: providers.webSearch, ai: providers.ai, guard: dbUsageGuard(userId, settings.limits), site: opts.site });
  });
}

/** Aplica o prazo de retenção a conteúdo de terceiros (Google Places): mantém place_id, remove o resto. */
export async function purgeExpired(db: Db) {
  const ev = await db.query(`update evidences set value = null, details = jsonb_build_object('purged_at', now()), source_url = null
    where expires_at < now() and value is not null and source_type = 'google_places'`);
  const co = await db.query(`update companies set lat = null, lng = null, coords_expire_at = null where coords_expire_at < now() and not ('location' = any(locked_fields))`);
  // Moradas/telefones cuja única fonte é o Google e já expirou
  await db.query(`update companies c set address = null where address is not null and not ('address' = any(locked_fields))
    and not exists (select 1 from evidences e where e.company_id = c.id and e.source_type <> 'google_places' and e.field = 'listing')
    and exists (select 1 from evidences e where e.company_id = c.id and e.source_type = 'google_places' and e.expires_at < now())`);
  await db.query(`update companies c set phone_e164 = null where phone_e164 is not null and not ('phone' = any(locked_fields))
    and not exists (select 1 from evidences e where e.company_id = c.id and e.field = 'phone' and e.value = c.phone_e164 and (e.expires_at is null or e.expires_at > now()))`);
  await db.query(`delete from contacts ct where ct.kind = 'phone' and exists (select 1 from evidences e where e.id = ct.evidence_id and e.source_type = 'google_places' and e.value is null)`);
  return { evidences: ev.rowCount ?? 0, coords: co.rowCount ?? 0 };
}

export async function processOneJob(providers: Providers = getProviders(), opts: Pick<RunOptions, "site"> = {}): Promise<boolean> {
  const job = await withService(async (db) => (await db.query("select * from public.claim_next_job($1)", [WORKER_ID])).rows[0]);
  if (!job) return false;
  try {
    if (job.type === "search") {
      const r = await runSearch(job.owner_id, job.ref_id, { providers, site: opts.site });
      await withService((db) => db.query("update jobs set status = $2, updated_at = now(), last_error = null where id = $1", [job.id, r === "cancelled" ? "cancelled" : "completed"]));
    } else if (job.type === "reverify") {
      await reverifyCompany(job.owner_id, job.ref_id, providers, opts);
      await withService((db) => db.query("update jobs set status = 'completed', updated_at = now() where id = $1", [job.id]));
    } else if (job.type === "purge_expired") {
      await withUser(job.owner_id, (db) => purgeExpired(db));
      await withService((db) => db.query("update jobs set status = 'completed', updated_at = now() where id = $1", [job.id]));
    }
  } catch (e) {
    const msg = (e as Error).message.slice(0, 1000);
    const retry = job.attempts < job.max_attempts;
    await withService((db) => db.query(
      `update jobs set status = $2, last_error = $3, run_after = now() + make_interval(secs => $4), locked_at = null, locked_by = null, updated_at = now() where id = $1`,
      [job.id, retry ? "queued" : "failed", msg, 30 * 2 ** job.attempts]));
    if (!retry && job.type === "search")
      await withUser(job.owner_id, (db) => db.query("update searches set status = 'failed', error = $2, finished_at = now() where id = $1", [job.ref_id, msg]));
  }
  return true;
}
