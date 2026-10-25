import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPublicAddress } from "@/lib/net/ip";
import { safeFetch, validateUrl, fetchWithRetries } from "@/lib/net/safe-fetch";
import { normalizeName, normalizePhonePT, companyDomain, nameSimilarity, textMentionsName } from "@/lib/domain/normalize";
import { decideDedup } from "@/lib/domain/dedup";
import { computeScore, whyContactNow, type ScoringFacts } from "@/lib/domain/scoring";
import { DEFAULT_RUBRIC } from "@/lib/domain/rubric";
import { analyzeHtml } from "@/lib/analysis/html";
import { analyzeWebsite, parseRobots, robotsAllows } from "@/lib/analysis/site";
import { buildDrafts, channelLink, DoNotContactError, NoSourcedObservationError, validateDraftText } from "@/lib/domain/outreach";
import { googlePlacesProvider, mapPlace } from "@/lib/providers/google-places";
import { braveProvider } from "@/lib/providers/brave";
import { buildOverpassQuery, mapOsm } from "@/lib/providers/osm";
import { sanitizeClassification } from "@/lib/providers/ai";
import { ProviderNotConfiguredError, QuotaExceededError, type UsageGuard } from "@/lib/providers/types";
import { classifyNiche } from "@/lib/domain/niches";
import { todayLisbon } from "@/lib/domain/time";
import { startFixtureServer } from "./fixtures/site-server";

const freeGuard: UsageGuard = { consume: async () => {}, report: async () => {} };

describe("rede: bloqueio de endereços privados e URLs inseguros", () => {
  it("classifica IPs públicos e privados", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"])
      expect(isPublicAddress(ip), ip).toBe(false);
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) expect(isPublicAddress(ip), ip).toBe(true);
  });
  it("recusa localhost, credenciais, portas e protocolos não permitidos", () => {
    expect(validateUrl("http://localhost/")).toMatch(/local/);
    expect(validateUrl("http://127.0.0.1/")).toMatch(/privado/);
    expect(validateUrl("http://[::1]/")).toMatch(/privado/);
    expect(validateUrl("http://user:pass@example.com/")).toMatch(/credenciais/);
    expect(validateUrl("http://example.com:22/")).toMatch(/porta/);
    expect(validateUrl("file:///etc/passwd")).toMatch(/protocolo/);
    expect(validateUrl("https://example.com/")).toBeNull();
  });
  it("com a política por defeito não acede a 127.0.0.1", async () => {
    const r = await safeFetch("http://127.0.0.1:1/");
    expect(r.outcome).toBe("unsafe_url");
  });
});

describe("normalização e deduplicação", () => {
  it("normaliza telefones PT e nomes", () => {
    expect(normalizePhonePT("259 000 001")).toBe("+351259000001");
    expect(normalizePhonePT("+351 912 000 002")).toBe("+351912000002");
    expect(normalizePhonePT("12345")).toBeNull();
    expect(normalizeName("Clínica Dentária Sorriso, Lda.")).toBe("clinica dentaria sorriso");
    expect(companyDomain("https://www.facebook.com/xyz")).toBeNull();
    expect(companyDomain("www.clinica.pt/contactos")).toBe("clinica.pt");
    expect(nameSimilarity("Barbearia Central", "Barbearia Central Lda")).toBe(1);
    expect(textMentionsName("Bem-vindo à Clínica Dentária Sorriso em Vila Real", "Clínica Dentária Sorriso")).toBe(true);
  });
  it("homónimo noutra localidade é empresa diferente", () => {
    const d = decideDedup({ nameNorm: "clinica sorriso", localityNorm: "vila real de santo antonio", lat: 37.19, lng: -7.41 },
      [{ id: "a", nameNorm: "clinica sorriso", localityNorm: "vila real", lat: 41.29, lng: -7.74 }]);
    expect(d.kind).toBe("new");
  });
  it("mesmo nome e localidade sem outros dados → mesma empresa", () => {
    expect(decideDedup({ nameNorm: "barbearia central", localityNorm: "vila real" }, [{ id: "a", nameNorm: "barbearia central", localityNorm: "vila real" }]).kind).toBe("match");
  });
  it("mesmo nome na mesma cidade mas noutra morada não é fundido", () => {
    expect(decideDedup({ nameNorm: "cafe central", localityNorm: "vila real", postcode: "5000-100" }, [{ id: "a", nameNorm: "cafe central", localityNorm: "vila real", postcode: "5000-600" }]).kind).toBe("new");
  });
  it("mesmo domínio com morada diferente → filial distinta", () => {
    const d = decideDedup({ nameNorm: "ginasio x", domain: "ginasiox.pt", postcode: "5000-100", phone: "+351259111111" },
      [{ id: "a", nameNorm: "ginasio x", domain: "ginasiox.pt", postcode: "5400-100", phone: "+351276111111" }]);
    expect(d.kind).toBe("branch");
  });
  it("place_id iguais → mesma empresa; place_id diferentes com o mesmo telefone e moradas iguais não funde", () => {
    expect(decideDedup({ nameNorm: "x", googlePlaceId: "P1" }, [{ id: "a", nameNorm: "y", googlePlaceId: "P1" }]).kind).toBe("match");
    expect(decideDedup({ nameNorm: "x", googlePlaceId: "P2", phone: "+351259000000" }, [{ id: "a", nameNorm: "x", googlePlaceId: "P1", phone: "+351259000000" }]).kind).not.toBe("match");
  });
});

function facts(over: Partial<ScoringFacts> = {}): ScoringFacts {
  const now = new Date("2026-10-25T10:00:00Z");
  return {
    mode: "clients", identity: "confirmed", location: "confirmed", businessStatus: "operational",
    niche: { key: "clinica_dentaria", status: "confirmed", inTargetList: true }, isAgency: false, agencyOffersWebdev: null,
    websiteStatus: "confirmed",
    opportunities: [{ type: "booking_link_error", tier: "principal", verification: "reproduced", evidenceIds: ["e1"], observed: "Ligação de marcação devolve 404" }],
    activity: [{ kind: "dated", date: "2026-10-01T00:00:00Z", source: "site oficial", evidenceId: "e2" }],
    contacts: [{ kind: "phone", status: "confirmed", onOfficialSite: true, crossConfirmed: true, evidenceId: "e3" }],
    evidence: { independentSources: 3, newestObservedAt: now.toISOString(), oldestKeyObservedAt: now.toISOString(), openConflicts: [], inconclusiveChecks: 0 },
    now, ...over,
  };
}

describe("pontuação determinística", () => {
  it("caso completo: 100 pontos, confiança alta, prioridade alta", () => {
    const s = computeScore(facts(), DEFAULT_RUBRIC);
    expect(s.criteria.map((c) => c.points)).toEqual([40, 20, 20, 20]);
    expect(s.total).toBe(100);
    expect(s.confidence).toBe("alto");
    expect(s.priority).toBe("alta");
    expect(s.qualification).toBe("qualified");
  });
  it("não soma várias descrições do mesmo problema (usa o nível mais forte)", () => {
    const s = computeScore(facts({ opportunities: [
      { type: "booking_link_error", tier: "principal", verification: "reproduced", evidenceIds: ["e1"], observed: "a" },
      { type: "no_viewport", tier: "minor", verification: "visual_structural", evidenceIds: ["e4"], observed: "b" },
      { type: "cta_wrong_destination", tier: "obstacle", verification: "visual_structural", evidenceIds: ["e5"], observed: "c" },
    ] }), DEFAULT_RUBRIC);
    expect(s.criteria[0].points).toBe(40);
  });
  it("falha vista uma só vez vale menos do que reproduzida", () => {
    const s = computeScore(facts({ opportunities: [{ type: "homepage_error", tier: "principal", verification: "single_observation", evidenceIds: ["e1"], observed: "x" }] }), DEFAULT_RUBRIC);
    expect(s.criteria[0].points).toBe(DEFAULT_RUBRIC.opportunity.principal_single);
  });
  it("site não localizado só pontua com pesquisa documentada e mantém-se hipótese", () => {
    const withSearch = computeScore(facts({ websiteStatus: "not_located", opportunities: [{ type: "website_not_located", tier: "not_located", verification: "documented_search", evidenceIds: ["s"], observed: "x" }] }), DEFAULT_RUBRIC);
    expect(withSearch.criteria[0].points).toBe(25);
    const f = facts({ websiteStatus: "not_located", opportunities: [{ type: "website_not_located", tier: "not_located", verification: "documented_search", evidenceIds: ["s"], observed: "x" }] });
    expect(whyContactNow(f, withSearch)).toMatch(/hipótese/);
    const noSearch = computeScore(facts({ websiteStatus: "not_verified", opportunities: [] }), DEFAULT_RUBRIC);
    expect(noSearch.criteria[0].points).toBe(0);
    expect(noSearch.qualification).toBe("review");
  });
  it("timeout/bloqueio não é prova de site offline: 0 pontos e revisão, não descarte", () => {
    const s = computeScore(facts({ websiteStatus: "unreachable", opportunities: [] }), DEFAULT_RUBRIC);
    expect(s.criteria[0].points).toBe(0);
    expect(s.criteria[0].explanation).toMatch(/não prova/);
    expect(s.qualification).toBe("review");
    expect(computeScore(facts({ websiteStatus: "blocked", opportunities: [] }), DEFAULT_RUBRIC).qualification).toBe("review");
  });
  it("site verificado sem oportunidade → descartado com motivo", () => {
    const s = computeScore(facts({ opportunities: [] }), DEFAULT_RUBRIC);
    expect(s.qualification).toBe("discarded");
    expect(s.qualificationReasons.join()).toMatch(/sem oportunidade/);
  });
  it("dados desconhecidos não recebem pontos", () => {
    const s = computeScore(facts({ identity: "unverified", location: "unverified", niche: { key: null, status: "unknown", inTargetList: false }, activity: [], contacts: [] }), DEFAULT_RUBRIC);
    expect(s.criteria[1].points).toBe(0);
    expect(s.criteria[2].points).toBe(0);
    expect(s.criteria[3].points).toBe(0);
    expect(s.qualification).toBe("review");
  });
  it("contacto com identidade por confirmar não pontua; contacto só da listagem vale o nível intermédio", () => {
    expect(computeScore(facts({ identity: "unverified" }), DEFAULT_RUBRIC).criteria[3].points).toBe(0);
    expect(computeScore(facts({ contacts: [{ kind: "phone", status: "confirmed", onOfficialSite: false, crossConfirmed: false, evidenceId: "x" }] }), DEFAULT_RUBRIC).criteria[3].points).toBe(12);
  });
  it("score alto sem requisitos fica média e mostra o que falta", () => {
    const s = computeScore(facts({ location: "inferred", evidence: { independentSources: 1, newestObservedAt: null, oldestKeyObservedAt: "2026-01-01T00:00:00Z", openConflicts: [], inconclusiveChecks: 0 } }), DEFAULT_RUBRIC);
    expect(s.total).toBeGreaterThanOrEqual(75);
    expect(s.priority).toBe("media");
    expect(s.priorityGaps).toEqual(expect.arrayContaining(["localização não confirmada"]));
    expect(s.priorityGaps.some((g) => g.startsWith("confiança"))).toBe(true);
  });
  it("conflito crítico baixa a confiança e envia para revisão", () => {
    const s = computeScore(facts({ evidence: { ...facts().evidence, openConflicts: [{ field: "website" }] } }), DEFAULT_RUBRIC);
    expect(s.confidence).toBe("baixo");
    expect(s.qualification).toBe("review");
  });
  it("empresa encerrada ou fora da região é descartada", () => {
    expect(computeScore(facts({ businessStatus: "closed_permanently" }), DEFAULT_RUBRIC).qualification).toBe("discarded");
    expect(computeScore(facts({ location: "outside_region" }), DEFAULT_RUBRIC).qualification).toBe("discarded");
  });
  it("atividade: datada recente 20, < 1 ano 12, sinal fraco 6, antiga 0", () => {
    const at = (date: string | null, kind: "dated" | "operational_status" = "dated") => computeScore(facts({ activity: [{ kind, date, source: "x", evidenceId: "a" }] }), DEFAULT_RUBRIC).criteria[2].points;
    expect(at("2026-09-30T00:00:00Z")).toBe(20);
    expect(at("2026-03-01T00:00:00Z")).toBe(12);
    expect(at(null, "operational_status")).toBe(6);
    expect(at("2024-01-01T00:00:00Z")).toBe(0);
  });
  it("rubrica configurável altera os pontos", () => {
    const r = { ...DEFAULT_RUBRIC, opportunity: { ...DEFAULT_RUBRIC.opportunity, principal_reproduced: 30 } };
    expect(computeScore(facts(), r).criteria[0].points).toBe(30);
  });
});

describe("análise de HTML", () => {
  it("só identifica WhatsApp com ligação específica; telefone publicado não chega", () => {
    const a = analyzeHtml(`<body><p>Ligue 912 000 002</p></body>`, "https://x.fixture.invalid/", "X");
    expect(a.whatsapp).toHaveLength(0);
    expect(a.phonesInText).toEqual(["+351912000002"]);
    const b = analyzeHtml(`<body><a href="https://wa.me/351912000002">WhatsApp</a></body>`, "https://x.fixture.invalid/", "X");
    expect(b.whatsapp).toHaveLength(1);
  });
  it("só extrai emails publicados — nunca os adivinha pelo domínio", () => {
    const a = analyzeHtml(`<body><p>Bem-vindo</p></body>`, "https://clinica.fixture.invalid/", "Clinica");
    expect(a.emails).toEqual([]);
  });
  it("deteta texto provisório, botões sem destino e marcações", () => {
    const a = analyzeHtml(`<body><p>Lorem ipsum dolor</p><a href="#">Marcar consulta</a><a href="https://www.fresha.com/x">Reservar</a><a href="#secao">Contacte-nos</a></body>`, "https://x.fixture.invalid/", "X");
    expect(a.placeholders[0].pattern).toBe("lorem ipsum");
    expect(a.wrongCtas.map((w) => w.reason)).toEqual(expect.arrayContaining(["ligação sem destino", "âncora #secao inexistente na página"]));
    expect(a.booking.some((b) => b.url.includes("fresha"))).toBe(true);
  });
  it("robots.txt é respeitado", () => {
    const r = parseRobots("User-agent: *\nDisallow: /privado/\nAllow: /privado/publico");
    expect(robotsAllows(r, "/")).toBe(true);
    expect(robotsAllows(r, "/privado/x")).toBe(false);
    expect(robotsAllows(r, "/privado/publico")).toBe(true);
  });
});

describe("análise de sites (servidor local com sites fictícios)", () => {
  let srv: Awaited<ReturnType<typeof startFixtureServer>>;
  beforeAll(async () => { srv = await startFixtureServer(); });
  afterAll(async () => { await srv.close(); });
  const deps = () => ({ fetchOptions: srv.fetchOptions, mobile: false, retryDelayMs: 10 });

  it("ligação de marcação partida é falha principal reproduzida, com evidência ligada", async () => {
    const r = await analyzeWebsite({ url: `${srv.base}/clinica-a/`, companyName: "Clínica Dentária Sorriso Fixture", locality: "Vila Real", knownPhones: ["+351259000001"], isAgency: false }, deps());
    expect(r.websiteStatus).toBe("confirmed");
    expect(r.identity.phoneMatch).toBe(true);
    const o = r.opportunities.find((x) => x.type === "booking_link_error")!;
    expect(o.verification).toBe("reproduced");
    expect(o.evidenceKeys.length).toBe(1);
    expect(r.evidences.find((e) => e.key === o.evidenceKeys[0])!.sourceUrl).toContain("marcacoes-antigas");
    expect(r.contacts.some((c) => c.kind === "email" && c.value === "geral@clinica-a.fixture.invalid")).toBe(true);
    expect(r.contacts.some((c) => c.kind === "whatsapp")).toBe(false);
  });
  it("texto provisório confirmado em 2.º pedido; WhatsApp só com wa.me", async () => {
    const r = await analyzeWebsite({ url: `${srv.base}/salao-b/`, companyName: "Salão Beleza Fixture", locality: "Vila Real", knownPhones: [], isAgency: false }, deps());
    expect(r.opportunities.find((o) => o.type === "placeholder_text")?.verification).toBe("reproduced");
    expect(r.opportunities.find((o) => o.type === "no_viewport")).toBeTruthy();
    expect(r.contacts.some((c) => c.kind === "whatsapp")).toBe(true);
  });
  it("timeout → inacessível (inconclusivo), sem oportunidade", async () => {
    const r = await analyzeWebsite({ url: `${srv.base}/lento/`, companyName: "Lento Fixture", locality: null, knownPhones: [], isAgency: false }, deps());
    expect(r.outcome).toBe("timeout");
    expect(r.websiteStatus).toBe("unreachable");
    expect(r.opportunities).toHaveLength(0);
    expect(r.evidences[0].status).toBe("unavailable");
  });
  it("bloqueio/CAPTCHA → bloqueado, não indisponível nem offline", async () => {
    const a = await analyzeWebsite({ url: `${srv.base}/bloqueado/`, companyName: "B Fixture", locality: null, knownPhones: [], isAgency: false }, deps());
    expect(a.outcome).toBe("blocked");
    expect(a.websiteStatus).toBe("blocked");
    const c = await analyzeWebsite({ url: `${srv.base}/captcha/`, companyName: "C Fixture", locality: null, knownPhones: [], isAgency: false }, deps());
    expect(c.outcome).toBe("captcha");
    expect(c.opportunities).toHaveLength(0);
  });
  it("site que não menciona a empresa → conflito de identidade", async () => {
    const r = await analyzeWebsite({ url: `${srv.base}/outra-empresa/`, companyName: "Clínica Dentária Sorriso Fixture", locality: "Vila Real", knownPhones: ["+351259000001"], isAgency: false }, deps());
    expect(r.websiteStatus).toBe("conflict");
  });
  it("redireção para IP privado é bloqueada; resposta grande é truncada", async () => {
    const r = await safeFetch(`${srv.base}/redirect-privado/`, srv.fetchOptions);
    expect(r.outcome).toBe("unsafe_url");
    const g = await safeFetch(`${srv.base}/grande/`, { ...srv.fetchOptions, maxBytes: 100_000 });
    expect(g.truncated).toBe(true);
    expect(g.body.length).toBeLessThanOrEqual(100_000);
  });
  it("404 repetido é reproduzido; botão sem destino detetado", async () => {
    const r = await fetchWithRetries(`${srv.base}/nao-existe`, { ...srv.fetchOptions, attempts: 2, delayMs: 10 });
    expect(r.reproduced).toBe(true);
    const b = await analyzeWebsite({ url: `${srv.base}/barbearia-c/`, companyName: "Barbearia Fixture", locality: "Vila Real", knownPhones: [], isAgency: false }, deps());
    expect(b.opportunities.find((o) => o.type === "cta_wrong_destination")).toBeTruthy();
    expect(b.contacts.some((c) => c.kind === "whatsapp")).toBe(false);
  });
  it("verificação móvel com navegador automatizado (se Playwright existir)", async () => {
    const r = await analyzeWebsite({ url: `${srv.base}/clinica-a/`, companyName: "Clínica Dentária Sorriso Fixture", locality: "Vila Real", knownPhones: [], isAgency: false },
      { fetchOptions: srv.fetchOptions, mobile: true, retryDelayMs: 10 });
    expect(r.mobile).not.toBeNull();
    if (r.mobile!.available) {
      expect(r.mobile!.error).toBeUndefined();
      expect(r.mobile!.horizontalOverflowPx).toBeDefined();
      expect(r.tools.some((t) => t.tool.includes("playwright"))).toBe(true);
    }
  });
});

describe("abordagem", () => {
  const opp = { type: "booking_link_error", observed: "x", evidenceIds: ["e1"], sourceUrl: "https://x", verifiedAt: "2026-10-20T10:00:00Z" };
  const ctx = { companyName: "Clínica Fixture", isAgency: false, pipelineStage: "qualificado", opportunity: opp, followups: 2, senderName: "Ulisses", loggedContacts: 0 };
  it("bloqueia «não contactar» e exige observação com fonte", () => {
    expect(() => buildDrafts({ ...ctx, pipelineStage: "nao_contactar" })).toThrow(DoNotContactError);
    expect(() => buildDrafts({ ...ctx, opportunity: null })).toThrow(NoSourcedObservationError);
    expect(() => buildDrafts({ ...ctx, opportunity: { ...opp, evidenceIds: [] } })).toThrow(NoSourcedObservationError);
  });
  it("gera mensagem curta, email e até 2 acompanhamentos, sem frases proibidas", () => {
    const d = buildDrafts(ctx);
    expect(d.map((x) => x.channel)).toEqual(["curta", "email", "followup_1", "followup_2"]);
    expect(buildDrafts({ ...ctx, followups: 1 })).toHaveLength(3);
    for (const x of d) expect(validateDraftText(x.body, { loggedContacts: 0, companyName: "Clínica Fixture", allowedNumbers: ["20"] }).filter((p) => !p.startsWith("não menciona"))).toEqual([]);
    expect(d[0].body).toMatch(/marcações/);
  });
  it("site não localizado pergunta em vez de afirmar", () => {
    const d = buildDrafts({ ...ctx, opportunity: { ...opp, type: "website_not_located" } });
    expect(d[0].body).toMatch(/\?/);
    expect(d[0].body).not.toMatch(/não têm site/);
  });
  it("agência recebe proposta de parceria", () => {
    expect(buildDrafts({ ...ctx, isAgency: true })[1].body).toMatch(/parceria/);
  });
  it("validação apanha falsas urgências, perdas de clientes e contactos não registados", () => {
    const p = validateDraftText("Estão a perder clientes! Como combinámos, é urgente. 30% mais vendas.", { loggedContacts: 0, companyName: "X" });
    expect(p).toEqual(expect.arrayContaining(["afirmação de perda de clientes sem dados", "falsa urgência", "contacto prévio não registado", "métrica inventada"]));
  });
  it("não abre WhatsApp a partir de um simples número de telefone", () => {
    const d = buildDrafts(ctx)[0];
    expect(channelLink("whatsapp", "+351912000002", d)).toBeNull();
    expect(channelLink("whatsapp", "https://wa.me/351912000002", d)).toContain("text=");
  });
});

describe("adaptadores (fixtures — não provam o funcionamento das APIs reais)", () => {
  it("sem chaves: configurado=false e erro explícito, nunca resultados inventados", async () => {
    const g = googlePlacesProvider({ apiKey: "" });
    expect(g.configured()).toBe(false);
    await expect(g.search({ query: "x", nicheKey: "barbearia", center: { lat: 0, lng: 0 }, radiusKm: 1, maxResults: 5 }, freeGuard)).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    const b = braveProvider({ apiKey: "" });
    expect(b.configured()).toBe(false);
    await expect(b.search("x", freeGuard)).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });
  it("Google Places: pedido com field mask, locationBias e mapeamento", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fake = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(JSON.stringify({ places: [{ id: "FIXTURE_PLACE_1", displayName: { text: "Barbearia Fixture" }, formattedAddress: "Rua X, 5000-123 Vila Real, Portugal",
        location: { latitude: 41.3, longitude: -7.74 }, nationalPhoneNumber: "259 000 009", businessStatus: "OPERATIONAL", types: ["barber_shop"],
        addressComponents: [{ longText: "Vila Real", types: ["locality"] }, { longText: "5000-123", types: ["postal_code"] }] }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const g = googlePlacesProvider({ apiKey: "test-key", fetchImpl: fake });
    const out = await g.search({ query: "barbearia em Vila Real", nicheKey: "barbearia", center: { lat: 41.2959, lng: -7.7464 }, radiusKm: 10, maxResults: 5 }, freeGuard);
    expect(captured!.url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toContain("places.websiteUri");
    const body = JSON.parse(captured!.init.body as string);
    expect(body.locationBias.circle.radius).toBe(10000);
    expect(out[0]).toMatchObject({ externalId: "FIXTURE_PLACE_1", postcode: "5000-123", locality: "Vila Real", businessStatus: "operational" });
    expect(mapPlace({ id: "z", businessStatus: "CLOSED_PERMANENTLY" }, "q").businessStatus).toBe("closed_permanently");
  });
  it("guarda de consumo interrompe a pesquisa ao atingir o limite", async () => {
    const guard: UsageGuard = { consume: async (p) => { throw new QuotaExceededError(p, 0); }, report: async () => {} };
    const g = googlePlacesProvider({ apiKey: "k", fetchImpl: (async () => new Response("{}")) as unknown as typeof fetch });
    await expect(g.search({ query: "x", nicheKey: "barbearia", center: { lat: 0, lng: 0 }, radiusKm: 1, maxResults: 5 }, guard)).rejects.toBeInstanceOf(QuotaExceededError);
  });
  it("Brave: lê a quota restante do cabeçalho", async () => {
    let remaining: string | null = null;
    const fake = (async () => new Response(JSON.stringify({ web: { results: [{ url: "https://x.fixture.invalid", title: "X" }] } }), { headers: { "x-ratelimit-remaining": "1, 950" } })) as unknown as typeof fetch;
    const r = await braveProvider({ apiKey: "k", fetchImpl: fake }).search("q", { consume: async () => {}, report: async (_p, v) => { remaining = v; } });
    expect(r).toHaveLength(1);
    expect(remaining).toBe("1, 950");
  });
  it("OSM: consulta Overpass e mapeamento", () => {
    const q = buildOverpassQuery({ query: "x", nicheKey: "barbearia", center: { lat: 41.3, lng: -7.7 }, radiusKm: 5, maxResults: 10 })!;
    expect(q).toContain('nwr["shop"="hairdresser"]["name"](around:5000,41.3,-7.7)');
    const c = mapOsm({ type: "node", id: 1, lat: 41.3, lon: -7.7, tags: { name: "Barbearia Fixture", "contact:phone": "+351 259 000 010", "disused:shop": "yes" } }, "x")!;
    expect(c.businessStatus).toBe("closed_permanently");
    expect(c.externalId).toBe("node/1");
  });
  it("IA: sugestões sem evidência válida passam a desconhecido", () => {
    const s = sanitizeClassification({ niche_key: "barbearia", niche_evidence_ids: ["inventado"], offers_web_development: "yes", offers_evidence_ids: [], summary: "x" }, new Set(["e1"]), "m");
    expect(s.nicheKey).toBeNull();
    expect(s.offersWebdev).toBeNull();
    const ok = sanitizeClassification({ niche_key: "barbearia", niche_evidence_ids: ["e1"], offers_web_development: "no", offers_evidence_ids: ["e1"], summary: "x" }, new Set(["e1"]), "m");
    expect(ok.nicheKey).toBe("barbearia");
  });
  it("nicho: tipos confirmam, nome apenas infere", () => {
    expect(classifyNiche({ types: ["barber_shop"], name: "X" }, ["barbearia"])?.status).toBe("confirmed");
    expect(classifyNiche({ name: "Barbearia do Zé" }, ["barbearia"])?.status).toBe("inferred");
    expect(classifyNiche({ name: "Loja" }, ["barbearia"])).toBeNull();
  });
  it("data civil em Europe/Lisbon", () => {
    expect(todayLisbon(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-25"); // após mudança de hora: UTC+0
    expect(todayLisbon(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02"); // verão: UTC+1
  });
});

describe("regressões", () => {
  it("IP não conta como domínio da empresa", () => {
    expect(companyDomain("http://127.0.0.1:3000/a/")).toBeNull();
  });
});

import { computeOutcome, type SourceLog } from "@/lib/pipeline/search-job";
import { signSession, verifySession, localUserId, credentialsMatch } from "@/lib/session";

describe("resultado da pesquisa: falha ≠ sem resultados", () => {
  const src = (status: SourceLog["status"], kind: SourceLog["kind"] = "discovery", results = 0): SourceLog => ({ provider: "x", kind, query: "q", at: "", results, status });
  const wsOk = src("ok", "web_search");
  it("sem chaves → não configurada", () => expect(computeOutcome([src("not_configured"), src("not_configured", "web_search")], 0, 0, 0)).toBe("not_configured"));
  it("rede bloqueada → falhou", () => expect(computeOutcome([src("failed"), src("not_configured")], 0, 0, 0)).toBe("failed"));
  it("uma fonte responde e outra falha → parcial", () => expect(computeOutcome([src("ok", "discovery", 3), src("failed"), wsOk], 3, 0, 0)).toBe("partial"));
  it("pesquisa web não configurada → parcial", () => expect(computeOutcome([src("ok", "discovery", 3), src("not_configured", "web_search")], 3, 0, 0)).toBe("partial"));
  it("candidatos com falha ou avisos → parcial", () => {
    expect(computeOutcome([src("ok", "discovery", 3)], 3, 1, 0)).toBe("partial");
    expect(computeOutcome([src("ok", "discovery", 3)], 3, 0, 2)).toBe("partial");
  });
  it("só «nenhuma empresa encontrada» quando todas as fontes responderam sem candidatos", () => {
    expect(computeOutcome([src("ok"), wsOk], 0, 0, 0)).toBe("no_results");
    expect(computeOutcome([src("ok"), src("not_configured")], 0, 0, 0)).toBe("partial");
    expect(computeOutcome([src("ok", "discovery", 2), wsOk], 2, 0, 0)).toBe("ok");
  });
});

describe("sessão local", () => {
  const secret = "s".repeat(64);
  it("assina e verifica; rejeita adulteração e expiração", () => {
    const t = signSession({ sub: "a", email: "x@y.pt", demo: false, exp: Date.now() + 10_000 }, secret);
    expect(verifySession(t, secret)?.email).toBe("x@y.pt");
    expect(verifySession(t, "outro".repeat(10))).toBeNull();
    const [b, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "a", email: "x@y.pt", demo: true, exp: Date.now() + 10_000 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, secret)).toBeNull();
    expect(verifySession(`${b}.${sig}`, secret, Date.now() + 20_000)).toBeNull();
  });
  it("id local estável e credenciais em tempo constante", () => {
    expect(localUserId("Ulisses@Exemplo.pt ")).toBe(localUserId("ulisses@exemplo.pt"));
    expect(localUserId("a@b.pt")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(credentialsMatch("A@b.pt", "segredo-longo", "a@b.pt", "segredo-longo")).toBe(true);
    expect(credentialsMatch("a@b.pt", "errado", "a@b.pt", "segredo-longo")).toBe(false);
  });
});
