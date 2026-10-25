/*
 * Validação do percurso completo com fontes REAIS (não usa fixtures):
 * diagnóstico → pesquisa de até 5 candidatos em Vila Real (distrito de Vila Real) → verificação → pontuação → gravação → pipeline.
 *
 * Uso (Docker):   docker compose run --rm worker npm run validate:real
 * Uso (local):    npm run validate:real
 * Opções:         --max 5   --niches clinica_dentaria,barbearia,cabeleireiro   --radius 10   --user-id <uuid> (modo Supabase)
 *
 * A pesquisa fica gravada na sua conta e aparece em «Pesquisas». Gera um relatório em relatorios/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPool, withUser } from "../src/lib/db";
import { LOCATION_PRESETS } from "../src/lib/domain/geo";
import { SearchParamsSchema } from "../src/lib/domain/search-params";
import { checkIntegrations, discoveryReady } from "../src/lib/providers/check";
import { getProviders } from "../src/lib/providers/registry";
import { runSearch } from "../src/lib/pipeline/search-job";
import { localUserId } from "../src/lib/session";
import { dbUsageGuard, getSettings } from "../src/lib/settings";

const arg = (name: string, def?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};

type Line = { item: string; result: "PASSOU" | "FALHOU" | "N/A"; detail: string };

async function main() {
  const lines: string[] = [];
  const log = (s = "") => { console.log(s); lines.push(s); };
  const userId = arg("user-id") ?? (process.env.APP_LOGIN_EMAIL ? localUserId(process.env.APP_LOGIN_EMAIL) : null);
  if (!userId) { console.error("Defina APP_LOGIN_EMAIL no .env (modo local) ou passe --user-id <uuid> (modo Supabase)."); process.exit(2); }
  const max = Math.min(5, Math.max(1, Number(arg("max", "5"))));
  const niches = (arg("niches", "clinica_dentaria,cabeleireiro,barbearia") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  log(`# Validação real UDEV Prospect — ${new Date().toISOString()}`);
  log(`Utilizador: ${userId} · máximo ${max} candidatos · nichos ${niches.join(", ")}`);
  log("\n## 1. Diagnóstico das integrações");
  const settings = await withUser(userId, (db) => getSettings(db));
  const checks = await checkIntegrations(dbUsageGuard(userId, settings.limits));
  for (const c of checks) log(`- ${c.label}: **${c.status}** — ${c.detail}`);
  if (!discoveryReady(checks)) {
    log("\n**Impedimento:** nenhuma fonte de descoberta (Google Places ou OpenStreetMap) respondeu. A validação real não pode continuar.");
    log("Corrija os itens acima (chave em falta, API não ativada, faturação, firewall/proxy) e volte a correr este comando.");
    save(lines); await getPool().end(); process.exit(2);
  }

  const vr = LOCATION_PRESETS[0];
  const providers = checks.filter((c) => (c.id === "google_places" || c.id === "osm") && c.status === "ok").map((c) => c.id as "google_places" | "osm");
  const params = SearchParamsSchema.parse({ locationKey: vr.key, locality: vr.locality, center: vr.center, centerLabel: `${vr.label} (validação real)`,
    postcodePrefixes: vr.postcodePrefixes, excludeTerms: vr.excludeTerms, radiusKm: Number(arg("radius", "10")), niches,
    opportunityTypes: ["site_errors", "contact_path", "not_located", "minor"], mode: "clients", maxCandidates: max, providers });
  const searchId = await withUser(userId, async (db) => (await db.query("insert into searches (params) values ($1) returning id", [JSON.stringify(params)])).rows[0].id as string);
  log(`\n## 2. Pesquisa ${searchId} (fontes: ${providers.join(", ")})`);
  const t0 = Date.now();
  await runSearch(userId, searchId, { providers: getProviders() });
  log(`Concluída em ${Math.round((Date.now() - t0) / 1000)} s.`);

  // Releitura a partir da base de dados (prova de gravação)
  const r = await withUser(userId, async (db) => ({
    s: (await db.query("select status, outcome, error, sources_consulted, warnings, stats from searches where id = $1", [searchId])).rows[0],
    cands: (await db.query("select name, source, status, outcome, error, company_id from search_candidates where search_id = $1 order by name", [searchId])).rows,
    cos: (await db.query(
      `select c.id, c.name, c.identity_status, c.location_status, c.website_status, c.website_url, c.qualification_status, c.pipeline_stage, c.distance_km,
         s.total, s.confidence, s.priority, s.breakdown,
         (select count(*)::int from evidences e where e.company_id = c.id) evidencias,
         (select json_agg(json_build_object('kind', ct.kind, 'value', ct.value, 'status', ct.status, 'source', e.source_type, 'url', e.source_url))
            from contacts ct left join evidences e on e.id = ct.evidence_id where ct.company_id = c.id) contactos
       from companies c left join scores s on s.company_id = c.id and s.is_current
       where c.id in (select company_id from search_candidates where search_id = $1 and company_id is not null)`, [searchId])).rows,
  }));
  log(`Estado: ${r.s.status} · resultado: **${r.s.outcome}**${r.s.error ? ` — ${r.s.error}` : ""}`);
  log("\n### Fontes consultadas");
  for (const x of r.s.sources_consulted) log(`- ${x.provider} · «${x.query}» · ${x.status} · ${x.status === "ok" ? `${x.results} resultado(s)` : x.error}`);
  if (r.s.warnings?.length) { log("\n### Avisos"); for (const w of r.s.warnings) log(`- ${w.candidate}: ${w.note}`); }
  log("\n### Candidatos");
  for (const c of r.cands) log(`- ${c.name} (${c.source}) · ${c.status} · ${c.outcome ?? ""}${c.error ? ` · erro: ${c.error}` : ""}`);
  log("\n### Empresas gravadas");
  for (const c of r.cos) {
    log(`- **${c.name}** — identidade ${c.identity_status}, localização ${c.location_status}${c.distance_km != null ? ` (${Number(c.distance_km).toFixed(1)} km)` : ""}, site ${c.website_status}${c.website_url ? ` ${c.website_url}` : ""}`);
    log(`  score ${c.total ?? "—"} · confiança ${c.confidence ?? "—"} · prioridade ${c.priority ?? "—"} · ${c.qualification_status} · etapa ${c.pipeline_stage} · ${c.evidencias} evidências`);
    for (const k of c.breakdown?.criteria ?? []) log(`    · ${k.label}: ${k.points}/${k.max} — ${k.level}`);
    for (const ct of c.contactos ?? []) log(`    · contacto ${ct.kind}: ${ct.value} (${ct.status}, fonte ${ct.source}${ct.url ? ` ${ct.url}` : ""})`);
  }

  const done = r.cands.filter((c) => c.status === "done");
  const check: Line[] = [
    { item: "Pesquisa nas fontes", result: ["ok", "partial", "no_results"].includes(r.s.outcome) ? "PASSOU" : "FALHOU", detail: `resultado ${r.s.outcome}; ${r.cands.length} candidato(s)` },
    { item: "Fontes registadas com estado", result: r.s.sources_consulted.every((x: { status?: string }) => x.status) ? "PASSOU" : "FALHOU", detail: `${r.s.sources_consulted.length} consulta(s)` },
    { item: "Identificação da empresa", result: !r.cos.length ? "N/A" : r.cos.some((c) => c.identity_status === "confirmed") ? "PASSOU" : "FALHOU",
      detail: r.cos.map((c) => c.identity_status).join(", ") || "sem empresas" },
    { item: "Contactos publicados com fonte", result: !r.cos.length ? "N/A" : r.cos.some((c) => (c.contactos ?? []).some((x: { source: string | null }) => x.source)) ? "PASSOU" : "FALHOU",
      detail: `${r.cos.reduce((n, c) => n + (c.contactos?.length ?? 0), 0)} contacto(s)` },
    { item: "Pontuação calculada", result: !done.length ? "N/A" : r.cos.filter((c) => c.total != null).length >= new Set(done.map((c) => c.company_id)).size ? "PASSOU" : "FALHOU", detail: `${r.cos.filter((c) => c.total != null).length} empresa(s) pontuada(s)` },
    { item: "Gravação (releitura da BD)", result: r.cos.length === new Set(r.cands.filter((c) => c.company_id).map((c) => c.company_id)).size ? "PASSOU" : "FALHOU", detail: `${r.cos.length} empresa(s), ${r.cos.reduce((n, c) => n + c.evidencias, 0)} evidência(s)` },
    { item: "Entrada no pipeline", result: !r.cos.length ? "N/A" : r.cos.every((c) => c.pipeline_stage) ? "PASSOU" : "FALHOU", detail: r.cos.map((c) => c.pipeline_stage).join(", ") },
  ];
  log("\n## 3. Resultado da validação");
  log("| Item | Resultado | Detalhe |\n|---|---|---|");
  for (const c of check) log(`| ${c.item} | ${c.result} | ${c.detail} |`);
  log("\nPassos manuais seguintes (na interface): abrir a pesquisa, rever as evidências de cada lead, gerar rascunhos, registar um contacto e mover um lead no pipeline.");
  log("Verifique também à mão, num browser, 1–2 sites/contactos indicados: a validação automática não substitui a sua revisão.");
  save(lines);
  await getPool().end();
  process.exit(check.some((c) => c.result === "FALHOU") ? 1 : 0);
}

function save(lines: string[]) {
  const dir = path.resolve(process.env.REPORTS_DIR ?? "relatorios");
  mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `validacao-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(f, lines.join("\n") + "\n");
  console.log(`\nRelatório gravado em ${f}`);
}

main().catch(async (e) => { console.error(e); await getPool().end().catch(() => {}); process.exit(1); });
