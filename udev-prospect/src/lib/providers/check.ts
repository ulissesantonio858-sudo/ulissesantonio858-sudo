import Anthropic from "@anthropic-ai/sdk";
import { withService } from "../db";
import type { UsageGuard } from "./types";

/*
 * Diagnóstico das integrações com chamadas reais mínimas, escolhidas para custo zero ou mínimo:
 * - Google Places: Text Search com field mask "places.id" (SKU "Text Search Essentials (IDs Only)", sem custo segundo a tabela da Google)
 * - Brave: 1 pedido de pesquisa (conta para a quota/créditos)
 * - Overpass: /api/status (não executa consulta)
 * - Anthropic: GET /v1/models/{id} (não consome tokens)
 * As chaves nunca são mostradas; só o resultado.
 */

export type CheckStatus = "ok" | "not_configured" | "failed";
export interface CheckResult { id: string; label: string; required: boolean; status: CheckStatus; detail: string; checkedAt: string }

const t = (ms: number) => AbortSignal.timeout(ms);

function errDetail(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const c = err.cause?.code ?? err.cause?.message;
  return `${err.message}${c ? ` (${c})` : ""}`.slice(0, 300);
}

async function httpCheck(fn: () => Promise<Response>, okDetail: (r: Response, body: string) => string): Promise<{ status: CheckStatus; detail: string }> {
  try {
    const r = await fn();
    const body = await r.text();
    if (!r.ok) return { status: "failed", detail: `HTTP ${r.status}: ${body.replace(/\s+/g, " ").slice(0, 250)}` };
    return { status: "ok", detail: okDetail(r, body) };
  } catch (e) {
    return { status: "failed", detail: errDetail(e) };
  }
}

export async function checkIntegrations(guard: UsageGuard | null = null): Promise<CheckResult[]> {
  const at = () => new Date().toISOString();
  const out: CheckResult[] = [];
  const push = (id: string, label: string, required: boolean, r: { status: CheckStatus; detail: string }) => out.push({ id, label, required, ...r, checkedAt: at() });

  // Base de dados e worker
  try {
    const r = await withService(async (db) => ({
      migrations: (await db.query("select count(*)::int n from schema_migrations")).rows[0].n as number,
      worker: (await db.query("select max(last_seen) t from worker_heartbeats")).rows[0].t as Date | null,
    }));
    push("database", "Base de dados (Postgres)", true, { status: "ok", detail: `ligada; ${r.migrations} migração(ões) aplicada(s)` });
    const age = r.worker ? (Date.now() - new Date(r.worker).getTime()) / 1000 : null;
    push("worker", "Worker de pesquisas", true, age != null && age < 90
      ? { status: "ok", detail: `ativo (último sinal há ${Math.round(age)} s)` }
      : { status: "failed", detail: age == null ? "nunca deu sinal de vida — está a correr?" : `sem sinal há ${Math.round(age / 60)} min — as pesquisas não avançam` });
  } catch (e) {
    push("database", "Base de dados (Postgres)", true, { status: "failed", detail: errDetail(e) });
  }

  // Google Places API (New)
  const gkey = process.env.GOOGLE_PLACES_API_KEY;
  if (!gkey) push("google_places", "Google Places API (New)", false, { status: "not_configured", detail: "GOOGLE_PLACES_API_KEY vazia" });
  else {
    await guard?.consume("google_places").catch(() => {});
    push("google_places", "Google Places API (New)", false, await httpCheck(
      () => fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", signal: t(15000),
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": gkey, "X-Goog-FieldMask": "places.id" },
        body: JSON.stringify({ textQuery: "Vila Real, Portugal", pageSize: 1, regionCode: "PT" }) }),
      (_r, body) => `respondeu; ${(JSON.parse(body).places ?? []).length} local(is) devolvido(s) para «Vila Real, Portugal»`));
  }

  // OpenStreetMap / Overpass
  if (process.env.OSM_ENABLED === "false") push("osm", "OpenStreetMap (Overpass)", false, { status: "not_configured", detail: "OSM_ENABLED=false" });
  else {
    const base = (process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter").replace(/\/interpreter$/, "/status");
    push("osm", "OpenStreetMap (Overpass)", false, await httpCheck(() => fetch(base, { signal: t(15000), headers: { "User-Agent": "UDEV-Prospect/0.1 (diagnóstico)" } }),
      (_r, body) => `respondeu: ${body.split("\n").find((l) => /slots? available|Rate limit/i.test(l)) ?? "estado disponível"}`));
  }

  // Brave Search
  const bkey = process.env.BRAVE_SEARCH_API_KEY;
  if (!bkey) push("brave", "Brave Search API", false, { status: "not_configured", detail: "BRAVE_SEARCH_API_KEY vazia — sem ela, «site não localizado» não pode ser determinado" });
  else {
    await guard?.consume("brave").catch(() => {});
    push("brave", "Brave Search API", false, await httpCheck(
      () => fetch("https://api.search.brave.com/res/v1/web/search?q=Vila%20Real%20Portugal&count=1&country=PT", { signal: t(15000), headers: { Accept: "application/json", "X-Subscription-Token": bkey } }),
      (r) => `respondeu; quota restante reportada: ${r.headers.get("x-ratelimit-remaining") ?? "não indicada"}`));
  }

  // Anthropic (opcional)
  const akey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
  if (!akey) push("anthropic", "Anthropic (IA opcional)", false, { status: "not_configured", detail: "ANTHROPIC_API_KEY vazia — classificação só por regras" });
  else {
    try {
      const m = await new Anthropic({ apiKey: akey, timeout: 15000, maxRetries: 0 }).models.retrieve(model);
      push("anthropic", "Anthropic (IA opcional)", false, { status: "ok", detail: `chave válida; modelo ${m.id} disponível` });
    } catch (e) { push("anthropic", "Anthropic (IA opcional)", false, { status: "failed", detail: errDetail(e) }); }
  }

  // Playwright (análise em ecrã móvel)
  try {
    const pw = await import(/* webpackIgnore: true */ "playwright");
    const b = await pw.chromium.launch();
    await b.close();
    push("playwright", "Playwright/Chromium (ecrã móvel)", false, { status: "ok", detail: "navegador arranca" });
  } catch (e) {
    push("playwright", "Playwright/Chromium (ecrã móvel)", false, { status: "not_configured", detail: `indisponível: ${errDetail(e).slice(0, 150)}` });
  }
  return out;
}

/** Há pelo menos uma fonte de descoberta a responder? */
export function discoveryReady(results: CheckResult[]) {
  return results.some((r) => (r.id === "google_places" || r.id === "osm") && r.status === "ok");
}
