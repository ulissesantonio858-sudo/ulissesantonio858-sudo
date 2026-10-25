/*
 * Testes de integração contra um Postgres real (DATABASE_URL_TEST), com o shim de autenticação local.
 * Os fornecedores de descoberta e pesquisa web aqui são FIXTURES (ver tests/fixtures/README.md):
 * validam o pipeline e as regras, não as APIs externas.
 */
import { randomUUID } from "node:crypto";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../scripts/migrate";
import { setPool, withUser } from "@/lib/db";
import { runSearch } from "@/lib/pipeline/search-job";
import { enqueueJob, processOneJob } from "@/lib/pipeline/jobs";
import { exportCsv, generateDrafts, importCsv, logContact, setStage, addOverride, dashboardMetrics, saveQualityReview, resolveConflict } from "@/lib/crm";
import { DoNotContactError } from "@/lib/domain/outreach";
import { ensureDemoData } from "@/lib/demo";
import { DEMO_USER_ID } from "@/lib/session";
import { LOCATION_PRESETS } from "@/lib/domain/geo";
import type { SearchParams } from "@/lib/domain/search-params";
import type { Providers } from "@/lib/providers/registry";
import type { DiscoveryCandidate, DiscoveryProvider, WebSearchProvider } from "@/lib/providers/types";
import { startFixtureServer } from "./fixtures/site-server";

const ADMIN_URL = process.env.DATABASE_URL_TEST;
const d = ADMIN_URL ? describe : describe.skip;

let srv: Awaited<ReturnType<typeof startFixtureServer>>;
const userA = randomUUID();
const userB = randomUUID();
const VR = LOCATION_PRESETS[0];

function cand(over: Partial<DiscoveryCandidate>): DiscoveryCandidate {
  return { source: "google_places", externalId: randomUUID(), name: "X Fixture", address: "Rua Fixture, 5000-001 Vila Real", locality: "Vila Real", postcode: "5000-001",
    lat: 41.30, lng: -7.745, phone: null, website: null, types: [], businessStatus: "operational", mapsUrl: null, query: "fixture", ...over };
}

function fixtureDiscovery(id: "google_places" | "osm", items: DiscoveryCandidate[]): DiscoveryProvider {
  return { id, label: `FIXTURE ${id}`, attribution: "fixture", configured: () => true, search: async (q) => items.filter((i) => (i as { nicheKey?: string }).nicheKey === undefined || true).slice(0, q.maxResults) };
}

function fixtureWebSearch(map: Record<string, string[]>): WebSearchProvider {
  return { id: "fixture_search", label: "FIXTURE pesquisa web", configured: () => true, search: async (q) => (map[q] ?? []).map((url) => ({ url, title: "fixture" })) };
}

function params(over: Partial<SearchParams> = {}): SearchParams {
  return { locationKey: VR.key, locality: VR.locality, center: VR.center, centerLabel: VR.label, postcodePrefixes: VR.postcodePrefixes, excludeTerms: VR.excludeTerms,
    radiusKm: 15, niches: ["clinica_dentaria"], opportunityTypes: ["site_errors", "contact_path", "not_located", "minor"], mode: "clients", maxCandidates: 50, providers: ["google_places"], ...over };
}

async function createSearch(user: string, p: SearchParams): Promise<string> {
  return withUser(user, async (db) => (await db.query("insert into searches (params) values ($1) returning id", [JSON.stringify(p)])).rows[0].id);
}

d("integração com base de dados", () => {
  beforeAll(async () => {
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query("drop schema if exists public cascade; create schema public; grant all on schema public to public;");
    await admin.end();
    await migrate(ADMIN_URL!, { localShim: true });
    setPool(new Pool({ connectionString: ADMIN_URL, max: 6 }));
    srv = await startFixtureServer();
  });
  afterAll(async () => { await srv?.close(); });

  it("RLS: um utilizador não vê nem escreve dados de outro", async () => {
    const id = await withUser(userA, async (db) => (await db.query("insert into companies (name, name_norm) values ('Privada Fixture','privada fixture') returning id")).rows[0].id);
    const seen = await withUser(userB, async (db) => (await db.query("select count(*)::int n from companies where id = $1", [id])).rows[0].n);
    expect(seen).toBe(0);
    await expect(withUser(userB, (db) => db.query("insert into companies (owner_id, name, name_norm) values ($1, 'x', 'x')", [userA]))).rejects.toThrow(/row-level security/);
    await expect(withUser(userB, (db) => db.query("insert into activities (company_id, type, body) values ($1, 'note', 'intrusão')", [id]))).rejects.toThrow();
    const upd = await withUser(userB, async (db) => (await db.query("update companies set name = 'hack' where id = $1", [id])).rowCount);
    expect(upd).toBe(0);
  });

  it("pesquisa completa: homónimos, fora da região, site não localizado vs não verificado, bloqueio vs timeout, duplicados", async () => {
    const items = [
      cand({ externalId: "FX_A", name: "Clínica Dentária Sorriso Fixture", phone: "259 000 001", website: `${srv.base}/clinica-a/`, types: ["dental_clinic"] }),
      // Homónimo em Vila Real de Santo António (outra região)
      cand({ externalId: "FX_A_VRSA", name: "Clínica Dentária Sorriso Fixture", address: "Av. Fixture, 8900-000 Vila Real de Santo António", locality: "Vila Real de Santo António", postcode: "8900-000", lat: 37.19, lng: -7.41, types: ["dental_clinic"] }),
      cand({ externalId: "FX_NOSITE", name: "Clínica Dentária Sem Site Fixture", phone: "259 000 020", types: ["dental_clinic"] }),
      cand({ externalId: "FX_SLOW", name: "Clínica Dentária Lenta Fixture", website: `${srv.base}/lento/`, types: ["dental_clinic"] }),
      cand({ externalId: "FX_BLOCK", name: "Clínica Dentária Protegida Fixture", website: `${srv.base}/bloqueado/`, types: ["dental_clinic"] }),
      cand({ externalId: "FX_CLOSED", name: "Clínica Dentária Fechada Fixture", businessStatus: "closed_permanently", types: ["dental_clinic"] }),
    ];
    const osmDup = cand({ source: "osm", externalId: "node/999", name: "Clinica Dentaria Sorriso Fixture", phone: "+351 259 000 001", lat: 41.30, lng: -7.745 });
    const providers: Providers = {
      discovery: [fixtureDiscovery("google_places", items), fixtureDiscovery("osm", [osmDup])],
      webSearch: fixtureWebSearch({ '"Clínica Dentária Sem Site Fixture" Vila Real': [`${srv.base}/outra-empresa/`, "https://www.facebook.com/fixture"] }),
      ai: null,
    };
    const sid = await createSearch(userA, params({ providers: ["google_places", "osm"] }));
    const r = await runSearch(userA, sid, { providers, site: { fetchOptions: srv.fetchOptions, mobile: false, retryDelayMs: 10 } });
    expect(r).toBe("completed");

    await withUser(userA, async (db) => {
      const cands = (await db.query("select external_id, status, outcome from search_candidates where search_id = $1", [sid])).rows;
      const by = Object.fromEntries(cands.map((c) => [c.external_id, c]));
      expect(by.FX_A_VRSA.status).toBe("skipped");
      expect(by.FX_A_VRSA.outcome).toMatch(/fora d/);
      expect(by.FX_CLOSED.outcome).toMatch(/encerrada/);
      expect(by["node/999"].status).toBe("duplicate");
      expect(by.FX_A.outcome).toMatch(/^qualificada: 100 pts, confiança alta/);

      const co = Object.fromEntries((await db.query("select c.*, s.total, s.confidence, s.priority, s.breakdown from companies c left join scores s on s.company_id = c.id and s.is_current where c.first_search_id = $1", [sid])).rows.map((c) => [c.google_place_id, c]));
      // Clínica A: marcação partida reproduzida, identidade e localização confirmadas
      const a = co.FX_A;
      expect(a.website_status).toBe("confirmed");
      expect(a.identity_status).toBe("confirmed");
      expect(a.location_status).toBe("confirmed");
      expect(a.qualification_status).toBe("qualified");
      expect(a.breakdown.criteria[0].points).toBe(40);
      const opp = (await db.query("select * from opportunities where company_id = $1 and type = 'booking_link_error'", [a.id])).rows[0];
      expect(opp.verification).toBe("reproduced");
      const ev = (await db.query("select * from evidences where id = any($1)", [opp.evidence_ids])).rows;
      expect(ev[0].source_url).toContain("marcacoes-antigas");
      // O mesmo local veio do OSM: os identificadores foram juntos na mesma empresa
      expect(a.osm_id).toBe("node/999");
      // Evidências do Google têm prazo de retenção
      const g = (await db.query("select expires_at from evidences where company_id = $1 and source_type = 'google_places' limit 1", [a.id])).rows[0];
      expect(g.expires_at).not.toBeNull();
      // Telefone publicado ≠ WhatsApp
      expect((await db.query("select count(*)::int n from contacts where company_id = $1 and kind = 'whatsapp'", [a.id])).rows[0].n).toBe(0);

      // Sem site: pesquisa documentada, site de outra empresa rejeitado → "não localizado" (hipótese)
      const ns = co.FX_NOSITE;
      expect(ns.website_status).toBe("not_located");
      const search = (await db.query("select * from evidences where company_id = $1 and field = 'website_search'", [ns.id])).rows[0];
      expect(search.details.query).toContain("Sem Site Fixture");
      expect(search.details.checked.length).toBe(2);
      expect((await db.query("select tier, verification from opportunities where company_id = $1", [ns.id])).rows[0]).toEqual({ tier: "not_located", verification: "documented_search" });

      // Timeout ≠ offline; bloqueio ≠ indisponível; ambos em revisão
      expect(co.FX_SLOW.website_status).toBe("unreachable");
      expect(co.FX_SLOW.qualification_status).toBe("review");
      expect(co.FX_BLOCK.website_status).toBe("blocked");
      expect(co.FX_BLOCK.qualification_status).toBe("review");
      expect(co.FX_A_VRSA).toBeUndefined();

      const s = (await db.query("select stats, sources_consulted, outcome from searches where id = $1", [sid])).rows[0];
      expect(s.outcome).toBe("ok");
      expect(s.stats.candidates).toBe(7);
      expect(s.sources_consulted.length).toBeGreaterThan(0);
    });

    // Sem pesquisa web configurada: "não verificado", não "não localizado"
    const sid2 = await createSearch(userA, params());
    await runSearch(userA, sid2, { providers: { discovery: [fixtureDiscovery("google_places", [cand({ externalId: "FX_NOSITE2", name: "Clínica Dentária Outra Fixture", types: ["dental_clinic"] })])], webSearch: null, ai: null }, site: { fetchOptions: srv.fetchOptions, mobile: false } });
    await withUser(userA, async (db) => {
      // Pesquisa web não configurada → a pesquisa fica «parcial», nunca «sem resultados»
      expect((await db.query("select outcome from searches where id = $1", [sid2])).rows[0].outcome).toBe("partial");
      const c = (await db.query("select website_status, qualification_status from companies where google_place_id = 'FX_NOSITE2'")).rows[0];
      expect(c).toEqual({ website_status: "not_verified", qualification_status: "review" });
    });
  });

  it("cancelar e retomar sem duplicar registos, preservando trabalho manual", async () => {
    const items = Array.from({ length: 4 }, (_, i) => cand({ externalId: `FX_R${i}`, name: `Clínica Dentária Retoma ${i} Fixture`, website: `${srv.base}/clinica-a/`, types: ["dental_clinic"] }));
    const site = { fetchOptions: srv.fetchOptions, mobile: false, retryDelayMs: 10 };
    // 1.ª pesquisa com 2 empresas; o utilizador escreve uma nota numa delas
    const s1 = await createSearch(userA, params());
    await runSearch(userA, s1, { providers: { discovery: [fixtureDiscovery("google_places", items.slice(0, 2))], webSearch: null, ai: null }, site });
    const r0 = await withUser(userA, async (db) => (await db.query("select id from companies where google_place_id = 'FX_R0'")).rows[0].id);
    await withUser(userA, (db) => db.query("insert into activities (company_id, type, body) values ($1, 'note', 'Nota manual importante')", [r0]));
    // 2.ª pesquisa com as 4; o cancelamento chega durante a descoberta
    const s2 = await createSearch(userA, params());
    const base = fixtureDiscovery("google_places", items);
    const cancelling: DiscoveryProvider = { ...base, search: async (q, g) => {
      const out = await base.search(q, g);
      await withUser(userA, (db) => db.query("update searches set status = 'cancel_requested' where id = $1", [s2]));
      return out;
    } };
    expect(await runSearch(userA, s2, { providers: { discovery: [cancelling], webSearch: null, ai: null }, site })).toBe("cancelled");
    const done = await withUser(userA, async (db) => (await db.query("select count(*)::int n from search_candidates where search_id = $1 and status = 'done'", [s2])).rows[0].n);
    expect(done).toBe(0);
    // Retomar
    await withUser(userA, (db) => db.query("update searches set status = 'queued' where id = $1", [s2]));
    expect(await runSearch(userA, s2, { providers: { discovery: [base], webSearch: null, ai: null }, site })).toBe("completed");
    await withUser(userA, async (db) => {
      expect((await db.query("select count(*)::int n from companies where google_place_id like 'FX_R%'")).rows[0].n).toBe(4);
      expect((await db.query("select count(*)::int n from search_candidates where search_id = $1", [s2])).rows[0].n).toBe(4);
      expect((await db.query("select count(*)::int n from search_candidates where search_id = $1 and status = 'done'", [s2])).rows[0].n).toBe(4);
      expect((await db.query("select count(*)::int n from activities where company_id = $1 and body = 'Nota manual importante'", [r0])).rows[0].n).toBe(1);
    });
  });

  it("fila persistente: o worker processa um trabalho e regista falhas com nova tentativa", async () => {
    const sid = await createSearch(userB, params());
    await withUser(userB, (db) => enqueueJob(db, "search", sid));
    await withUser(userB, (db) => enqueueJob(db, "search", sid)); // não duplica trabalho ativo
    const n = await withUser(userB, async (db) => (await db.query("select count(*)::int n from jobs where ref_id = $1", [sid])).rows[0].n);
    expect(n).toBe(1);
    const failing: Providers = { discovery: [{ id: "google_places", label: "FIXTURE falha", attribution: "", configured: () => true, search: async () => { throw new Error("fixture: erro do fornecedor"); } }], webSearch: null, ai: null };
    expect(await processOneJob(failing)).toBe(true);
    const job = await withUser(userB, async (db) => (await db.query("select status from jobs where ref_id = $1", [sid])).rows[0]);
    expect(job.status).toBe("completed"); // falha do fornecedor fica registada na pesquisa, não derruba o trabalho
    const s = await withUser(userB, async (db) => (await db.query("select status, sources_consulted from searches where id = $1", [sid])).rows[0]);
    expect(s.status).toBe("completed");
    expect(s.sources_consulted[0].error).toMatch(/erro do fornecedor/);
    expect(s.sources_consulted[0].status).toBe("failed");
    const o = await withUser(userB, async (db) => (await db.query("select outcome from searches where id = $1", [sid])).rows[0].outcome);
    expect(o).toBe("failed");
  });

  it("CSV: reimportar não duplica empresas nem notas e não apaga notas existentes; filiais preservadas", async () => {
    const csv = `nome,localidade,codigo_postal,telefone,email,website,notas
Barbearia Importada Fixture,Vila Real,5000-100,259000100,geral@barbearia.fixture.invalid,https://barbearia.fixture.invalid,Cliente indicado pelo João
Ginásio Rede Fixture,Vila Real,5000-200,259000200,,https://ginasio-rede.fixture.invalid,
Ginásio Rede Fixture,Chaves,5400-200,276000200,,https://ginasio-rede.fixture.invalid,Filial
,Vila Real,,,,,sem nome`;
    const first = await withUser(userA, (db) => importCsv(db, csv, "leads.csv"));
    expect(first.created).toBe(3);
    expect(first.branches).toBe(1);
    expect(first.errors).toHaveLength(1);
    const id = await withUser(userA, async (db) => (await db.query("select id from companies where name = 'Barbearia Importada Fixture'")).rows[0].id);
    await withUser(userA, (db) => db.query("insert into activities (company_id, type, body) values ($1, 'note', 'Nota escrita na app')", [id]));
    const second = await withUser(userA, (db) => importCsv(db, csv, "leads.csv"));
    expect(second.created).toBe(0);
    expect(second.matched).toBe(3);
    expect(second.notesAdded).toBe(0);
    await withUser(userA, async (db) => {
      expect((await db.query("select count(*)::int n from companies where name_norm = 'barbearia importada fixture'")).rows[0].n).toBe(1);
      const notes = (await db.query("select body from activities where company_id = $1 and type = 'note' order by created_at", [id])).rows.map((r) => r.body);
      expect(notes).toEqual(["Cliente indicado pelo João", "Nota escrita na app"]);
      expect((await db.query("select count(*)::int n from companies where name_norm = 'ginasio rede fixture'")).rows[0].n).toBe(2);
      const em = (await db.query("select status from contacts where company_id = $1 and kind = 'email'", [id])).rows[0];
      expect(em.status).toBe("inferred"); // importado ≠ confirmado
      const out = await exportCsv(db);
      expect(out.split("\n")[0]).toContain("nome");
      expect(out).toContain("Barbearia Importada Fixture");
    });
  });

  it("«não contactar» bloqueia rascunhos; contacto feito só com confirmação; correções com motivo e histórico", async () => {
    await withUser(userA, async (db) => {
      const a = (await db.query("select id from companies where google_place_id = 'FX_A'")).rows[0].id;
      const drafts = await generateDrafts(db, a);
      expect(drafts[0].body).toContain("Clínica Dentária Sorriso Fixture");
      expect(drafts[0].evidenceIds.length).toBeGreaterThan(0);
      await expect(logContact(db, a, { channel: "email", summary: "Enviei email", confirmed: false })).rejects.toThrow(/confirmar/);
      await logContact(db, a, { channel: "email", summary: "Enviei email inicial", confirmed: true });
      expect((await db.query("select pipeline_stage from companies where id = $1", [a])).rows[0].pipeline_stage).toBe("contacto_feito");
      await expect(addOverride(db, a, "priority", "baixa", "")).rejects.toThrow(/motivo/);
      await addOverride(db, a, "priority", "baixa", "Já tem fornecedor, segundo conversa");
      expect((await db.query("select priority from scores where company_id = $1 and is_current", [a])).rows[0].priority).toBe("baixa");
      expect((await db.query("select count(*)::int n from activities where company_id = $1 and type = 'override'", [a])).rows[0].n).toBe(1);
      await setStage(db, a, "nao_contactar", "pediu para não ser contactado");
      await expect(generateDrafts(db, a)).rejects.toBeInstanceOf(DoNotContactError);
      await expect(logContact(db, a, { channel: "email", summary: "x", confirmed: true })).rejects.toBeInstanceOf(DoNotContactError);
      expect((await db.query("select count(*)::int n from drafts where company_id = $1", [a])).rows[0].n).toBe(0);
    });
  });

  it("nova pesquisa não sobrescreve campos corrigidos manualmente nem reverifica «não contactar»", async () => {
    await withUser(userA, async (db) => {
      const ns = (await db.query("select id from companies where google_place_id = 'FX_NOSITE'")).rows[0].id;
      await addOverride(db, ns, "website_status", "confirmed", "Confirmado por telefone que têm site novo");
    });
    const sid = await createSearch(userA, params());
    await runSearch(userA, sid, { providers: { discovery: [fixtureDiscovery("google_places", [
      cand({ externalId: "FX_NOSITE", name: "Clínica Dentária Sem Site Fixture", phone: "259 000 020", types: ["dental_clinic"] }),
      cand({ externalId: "FX_A", name: "Clínica Dentária Sorriso Fixture", phone: "259 000 001", website: `${srv.base}/clinica-a/`, types: ["dental_clinic"] }),
    ])], webSearch: fixtureWebSearch({}), ai: null }, site: { fetchOptions: srv.fetchOptions, mobile: false, retryDelayMs: 10 } });
    await withUser(userA, async (db) => {
      expect((await db.query("select website_status from companies where google_place_id = 'FX_NOSITE'")).rows[0].website_status).toBe("confirmed");
      const out = (await db.query("select outcome from search_candidates where search_id = $1 and external_id = 'FX_A'", [sid])).rows[0].outcome;
      expect(out).toMatch(/não contactar/);
    });
  });

  it("indicadores: denominadores explícitos e precisão só sobre revistos", async () => {
    await withUser(userA, async (db) => {
      const m0 = await dashboardMetrics(db);
      expect(m0.quality.revistos).toBe(0);
      const ids = (await db.query("select id from companies where qualification_status = 'qualified' limit 2")).rows.map((r) => r.id);
      if (ids[0]) await saveQualityReview(db, ids[0], { adequate: true });
      const m = await dashboardMetrics(db);
      expect(m.quality.revistos).toBe(ids[0] ? 1 : 0);
      expect(m.reached.contacto_feito).toBeGreaterThanOrEqual(1);
      expect(m.analisados).toBeGreaterThan(0);
    });
  });

  it("divergências entre fontes são guardadas e resolvidas manualmente", async () => {
    await withUser(userA, async (db) => {
      const c = (await db.query("select id from companies where google_place_id = 'FX_A'")).rows[0].id;
      await db.query("insert into conflicts (company_id, field, candidates) values ($1, 'address', $2)", [c, JSON.stringify([{ value: "Rua A", source_type: "google_places" }, { value: "Rua B", source_type: "website" }])]);
      const cf = (await db.query("select id from conflicts where company_id = $1 and field = 'address' and status = 'open'", [c])).rows[0].id;
      await resolveConflict(db, cf, "Rua B", "morada do site oficial é mais recente");
      const row = (await db.query("select address, locked_fields from companies where id = $1", [c])).rows[0];
      expect(row.address).toBe("Rua B");
      expect(row.locked_fields).toContain("address");
    });
  });
  it("demonstração: dados fictícios só no utilizador demo, nunca nos leads/indicadores reais", async () => {
    const before = await withUser(userA, async (db) => ({ m: await dashboardMetrics(db), n: (await db.query("select count(*)::int n from companies")).rows[0].n }));
    await ensureDemoData();
    await ensureDemoData(); // idempotente
    const demo = await withUser(DEMO_USER_ID, async (db) => (await db.query("select name, qualification_status from companies")).rows);
    expect(demo).toHaveLength(3);
    expect(demo.every((c) => c.name.includes("(demonstração)"))).toBe(true);
    const after = await withUser(userA, async (db) => ({ m: await dashboardMetrics(db), n: (await db.query("select count(*)::int n from companies")).rows[0].n,
      demo: (await db.query("select count(*)::int n from companies where name like '%(demonstração)%'")).rows[0].n }));
    expect(after.n).toBe(before.n);
    expect(after.demo).toBe(0);
    expect(after.m.analisados).toBe(before.m.analisados);
  });
});
