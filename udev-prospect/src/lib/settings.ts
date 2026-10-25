import { withUser, type Db } from "./db";
import { DEFAULT_RUBRIC, DEFAULT_RUBRIC_VERSION, RubricSchema, type Rubric } from "./domain/rubric";
import { QuotaExceededError, type UsageGuard } from "./providers/types";

export const DEFAULT_LIMITS: Record<string, number> = { google_places: 100, brave: 50, anthropic: 100, osm: 30 };
export interface OutreachSettings { followups: number; senderName: string }
export const DEFAULT_OUTREACH: OutreachSettings = { followups: 2, senderName: "Ulisses" };

export interface AppSettings {
  limits: Record<string, number>;
  outreach: OutreachSettings;
  retentionDays: number;
  rubricVersion: number;
  rubric: Rubric;
}

export async function getSettings(db: Db): Promise<AppSettings> {
  await db.query("insert into settings (owner_id) values (auth.uid()) on conflict (owner_id) do nothing");
  const { rows } = await db.query("select * from settings where owner_id = auth.uid()");
  const s = rows[0];
  await db.query("insert into scoring_rubrics (version, config, notes) values ($1, $2, 'Rubrica inicial') on conflict (owner_id, version) do nothing",
    [DEFAULT_RUBRIC_VERSION, JSON.stringify(DEFAULT_RUBRIC)]);
  const r = await db.query("select config from scoring_rubrics where version = $1", [s.active_rubric_version]);
  const parsed = RubricSchema.safeParse(r.rows[0]?.config);
  return {
    limits: { ...DEFAULT_LIMITS, ...(s.limits ?? {}) },
    outreach: { ...DEFAULT_OUTREACH, ...(s.outreach ?? {}) },
    retentionDays: s.places_retention_days,
    rubricVersion: parsed.success ? s.active_rubric_version : DEFAULT_RUBRIC_VERSION,
    rubric: parsed.success ? parsed.data : DEFAULT_RUBRIC,
  };
}

/**
 * Guarda de consumo com limite diário (dia civil de Lisboa), atómica na base de dados.
 * Usa transação própria e confirmada de imediato: um pedido externo conta mesmo que o processamento falhe depois.
 */
export function dbUsageGuard(userId: string, limits: Record<string, number>): UsageGuard {
  return {
    async consume(provider, n = 1) {
      const limit = limits[provider] ?? 0;
      if (n > limit) throw new QuotaExceededError(provider, limit);
      const { rows } = await withUser(userId, (db) => db.query(
        `insert into api_usage (provider, day, requests) values ($1, (now() at time zone 'Europe/Lisbon')::date, $2)
         on conflict (owner_id, provider, day) do update set requests = api_usage.requests + excluded.requests, updated_at = now()
           where api_usage.requests + excluded.requests <= $3
         returning requests`, [provider, n, limit]));
      if (!rows.length) throw new QuotaExceededError(provider, limit);
    },
    async report(provider, remaining) {
      if (remaining == null) return;
      await withUser(userId, (db) => db.query(`update api_usage set last_remaining = $2, updated_at = now() where provider = $1 and day = (now() at time zone 'Europe/Lisbon')::date`, [provider, remaining]));
    },
  };
}
