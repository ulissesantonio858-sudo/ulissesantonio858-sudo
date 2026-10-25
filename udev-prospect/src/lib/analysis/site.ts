import { analyzeHtml, mentionsLocality, type HtmlAnalysis } from "./html";
import { checkMobile, type MobileCheck } from "./mobile";
import { fetchWithRetries, safeFetch, type SafeFetchOptions, type SafeFetchResult } from "../net/safe-fetch";
import { normalizeEmail } from "../domain/normalize";
import type { ContactDraft, EvidenceDraft, OpportunityDraft } from "./types";

export interface SiteInput {
  url: string;
  companyName: string;
  locality: string | null;
  knownPhones: string[];       // telefones de outras fontes (para cruzar identidade)
  isAgency: boolean;
}

export interface SiteDeps {
  fetchOptions?: SafeFetchOptions;
  mobile?: boolean;
  retryDelayMs?: number;
  checkMobileFn?: typeof checkMobile;
}

export interface SiteResult {
  url: string;
  finalUrl: string;
  outcome: SafeFetchResult["outcome"];
  httpStatus: number | null;
  attempts: number;
  websiteStatus: "confirmed" | "unreachable" | "blocked" | "conflict" | "not_verified";
  identity: { nameOnSite: boolean; phoneMatch: boolean; localityOnSite: boolean; postcodes: string[] };
  evidences: EvidenceDraft[];
  contacts: ContactDraft[];
  opportunities: OpportunityDraft[];
  pages: { url: string; outcome: string; status: number | null; fetchedAt: string }[];
  mobile: MobileCheck | null;
  tools: { tool: string; at: string }[];
  agencyOffersWebdev: boolean | null;
  inconclusiveChecks: number;
  /** Texto visível (não confiável) da página inicial, para classificação assistida. */
  textSample: string | null;
}

interface RobotsRules { disallow: string[]; allow: string[] }

export function parseRobots(txt: string, ua = "udev-prospect"): RobotsRules {
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m;
    const key = k.toLowerCase();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], disallow: [], allow: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "disallow" && v) cur.disallow.push(v);
    if (key === "allow" && v) cur.allow.push(v);
  }
  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const star = groups.find((g) => g.agents.includes("*"));
  const g = specific ?? star;
  return { disallow: g?.disallow ?? [], allow: g?.allow ?? [] };
}

export function robotsAllows(rules: RobotsRules, path: string): boolean {
  const match = (p: string) => path.startsWith(p.replace(/\*.*$/, "").replace(/\$$/, ""));
  const d = rules.disallow.filter(match).sort((a, b) => b.length - a.length)[0];
  const a = rules.allow.filter(match).sort((x, y) => y.length - x.length)[0];
  if (!d) return true;
  return !!a && a.length >= d.length;
}

let seq = 0;
const k = (p: string) => `${p}-${++seq}`;

export async function analyzeWebsite(input: SiteInput, deps: SiteDeps = {}): Promise<SiteResult> {
  const fo = deps.fetchOptions ?? {};
  const now = () => new Date().toISOString();
  const evidences: EvidenceDraft[] = [];
  const contacts: ContactDraft[] = [];
  const opportunities: OpportunityDraft[] = [];
  const pages: SiteResult["pages"] = [];
  const tools: SiteResult["tools"] = [{ tool: "safe-fetch (HTTP GET, sem execução de JavaScript)", at: now() }];
  let inconclusive = 0;
  let home: Awaited<ReturnType<typeof fetchWithRetries>> | null = null;
  const ev = (d: Omit<EvidenceDraft, "key" | "observedAt"> & { observedAt?: string }) => {
    const e: EvidenceDraft = { key: k("ev"), observedAt: d.observedAt ?? now(), ...d };
    evidences.push(e);
    return e;
  };

  // robots.txt: respeitar exclusões explícitas
  let rules: RobotsRules = { disallow: [], allow: [] };
  try {
    const origin = new URL(input.url).origin;
    const r = await safeFetch(origin + "/robots.txt", { ...fo, maxBytes: 200_000, timeoutMs: 8000 });
    if (r.outcome === "ok") rules = parseRobots(r.body);
  } catch { /* sem robots.txt utilizável */ }
  if (!robotsAllows(rules, new URL(input.url).pathname || "/")) {
    ev({ field: "website", value: input.url, sourceType: "website", sourceUrl: input.url, method: "robots.txt exclui a página inicial; site não analisado", status: "unavailable" });
    return emptyResult("disallowed_by_robots", "not_verified");
  }

  home = await fetchWithRetries(input.url, { ...fo, attempts: 2, delayMs: deps.retryDelayMs });
  const last = home.last;
  pages.push(...home.results.map((r) => ({ url: r.url, outcome: r.outcome, status: r.status, fetchedAt: r.fetchedAt })));
  const attemptsTxt = `${home.results.length} tentativa(s) entre ${home.results[0].fetchedAt.slice(0, 16)} e ${last.fetchedAt.slice(0, 16)} UTC`;

  if (last.outcome !== "ok") {
    switch (last.outcome) {
      case "dns_not_found": {
        const e = ev({ field: "website", value: input.url, sourceType: "website", sourceUrl: input.url, method: `pedido HTTP; ${attemptsTxt}`, status: home.reproduced ? "confirmed" : "inferred", details: { outcome: last.outcome, error: last.error } });
        opportunities.push({ type: "dns_not_found", tier: "principal", verification: home.reproduced ? "reproduced" : "single_observation",
          observed: `O domínio ${new URL(input.url).hostname} não resolve em DNS (${attemptsTxt}).`,
          possibleImpact: "Quem seguir a ligação publicada não chega ao site.", suggestedImprovement: "Verificar o registo do domínio/DNS ou atualizar a ligação nas listagens.", evidenceKeys: [e.key] });
        return emptyResult(last.outcome, "unreachable");
      }
      case "http_error": {
        const e = ev({ field: "website", value: `HTTP ${last.status}`, sourceType: "website", sourceUrl: input.url, method: `pedido HTTP GET; ${attemptsTxt}`, status: home.reproduced ? "confirmed" : "inferred", details: { status: last.status } });
        if (last.status && (last.status === 404 || last.status === 410 || last.status >= 500)) {
          opportunities.push({ type: "homepage_error", tier: "principal", verification: home.reproduced ? "reproduced" : "single_observation",
            observed: `A página inicial ${input.url} devolve HTTP ${last.status} (${attemptsTxt}).`,
            possibleImpact: "Visitantes podem não conseguir ver informação nem contactos.", suggestedImprovement: "Repor a página inicial e monitorizar a disponibilidade.", evidenceKeys: [e.key] });
          return emptyResult(last.outcome, "confirmed");
        }
        inconclusive++;
        return emptyResult(last.outcome, "blocked");
      }
      case "tls_error": {
        const e = ev({ field: "website", value: last.error, sourceType: "website", sourceUrl: input.url, method: `ligação HTTPS; ${attemptsTxt}`, status: home.reproduced ? "confirmed" : "inferred" });
        opportunities.push({ type: "tls_error", tier: "obstacle", verification: home.reproduced ? "reproduced" : "single_observation",
          observed: `Erro de certificado/TLS ao abrir ${input.url} (${last.error}).`,
          possibleImpact: "Os navegadores podem mostrar um aviso de segurança antes de abrir o site.", suggestedImprovement: "Renovar/configurar o certificado HTTPS.", evidenceKeys: [e.key] });
        return emptyResult(last.outcome, "confirmed");
      }
      case "insecure_redirect": {
        ev({ field: "website", value: last.error, sourceType: "website", sourceUrl: input.url, method: "redireção não seguida por segurança", status: "unavailable" });
        inconclusive++;
        return emptyResult(last.outcome, "not_verified");
      }
      case "blocked":
      case "captcha":
        ev({ field: "website", value: input.url, sourceType: "website", sourceUrl: input.url, method: `pedido bloqueado por proteção (${last.outcome}, HTTP ${last.status}); não contornado`, status: "unavailable" });
        inconclusive++;
        return emptyResult(last.outcome, "blocked");
      case "unsafe_url":
        ev({ field: "website", value: input.url, sourceType: "website", sourceUrl: input.url, method: `URL recusado pela política de segurança: ${last.error}`, status: "unavailable" });
        return emptyResult(last.outcome, "not_verified");
      default:
        // timeout, ligação recusada, erro de rede: não prova que o site esteja offline
        ev({ field: "website", value: input.url, sourceType: "website", sourceUrl: input.url, method: `${last.outcome} em ${attemptsTxt}; inconclusivo`, status: "unavailable", details: { error: last.error } });
        inconclusive++;
        return emptyResult(last.outcome, "unreachable");
    }
  }

  // Página inicial carregada
  const finalUrl = last.finalUrl;
  const h = analyzeHtml(last.body, finalUrl, input.companyName);
  const allTexts = [h.textSample];
  const extra: { url: string; a: HtmlAnalysis }[] = [];
  const contactPage = h.contactPages[0];
  const servicePages = h.servicePages.slice(0, 2);
  for (const p of [contactPage, ...servicePages].filter(Boolean) as { url: string; text: string }[]) {
    if (!robotsAllows(rules, new URL(p.url).pathname)) continue;
    const r = await fetchWithRetries(p.url, { ...fo, attempts: 2, delayMs: deps.retryDelayMs });
    pages.push({ url: p.url, outcome: r.last.outcome, status: r.last.status, fetchedAt: r.last.fetchedAt });
    if (r.last.outcome === "ok") {
      const a = analyzeHtml(r.last.body, r.last.finalUrl, input.companyName);
      extra.push({ url: p.url, a });
      allTexts.push(a.textSample);
    } else if (r.last.outcome === "http_error" && r.last.status && (r.last.status === 404 || r.last.status >= 500)) {
      const e = ev({ field: "issue:page_error", value: `HTTP ${r.last.status}`, sourceType: "website", sourceUrl: p.url, method: `ligação "${p.text}" a partir da página inicial; ${r.results.length} tentativa(s)`, status: r.reproduced ? "confirmed" : "inferred" });
      const isContact = p === contactPage;
      opportunities.push({ type: isContact ? "contact_page_error" : "service_page_error", tier: "principal", verification: r.reproduced ? "reproduced" : "single_observation",
        observed: `A ligação "${p.text}" (${p.url}) no menu devolve HTTP ${r.last.status}.`,
        possibleImpact: isContact ? "Quem procura os contactos encontra uma página de erro." : "Quem procura informação sobre o serviço encontra uma página de erro.",
        suggestedImprovement: "Corrigir a ligação ou repor a página.", evidenceKeys: [e.key] });
    } else if (["timeout", "blocked", "captcha", "connection_error"].includes(r.last.outcome)) inconclusive++;
  }
  const all = [h, ...extra.map((x) => x.a)];
  const pageOf = (i: number) => (i === 0 ? finalUrl : extra[i - 1].url);

  // Identidade: o site menciona o nome, o telefone conhecido, a localidade?
  const sitePhones = new Set(all.flatMap((a) => [...a.tel, ...a.phonesInText]));
  const phoneMatch = input.knownPhones.some((p) => sitePhones.has(p));
  const nameOnSite = all.some((a) => a.mentionsName);
  const localityOnSite = !!input.locality && allTexts.some((t) => mentionsLocality(t, input.locality!));
  const postcodes = [...new Set(all.flatMap((a) => a.postcodes))];
  const identityOk = nameOnSite || phoneMatch;
  ev({ field: "website", value: finalUrl, sourceType: "website", sourceUrl: finalUrl,
    method: `página inicial carregada (HTTP ${last.status}); nome ${nameOnSite ? "presente" : "ausente"}; telefone conhecido ${phoneMatch ? "presente" : "ausente"}`,
    status: identityOk ? "confirmed" : "conflict", details: { title: h.title, generator: h.generator, nameOnSite, phoneMatch, localityOnSite, postcodes } });

  // Contactos publicados no site (apenas os que constam na página; nada é adivinhado)
  all.forEach((a, i) => {
    const src = pageOf(i);
    for (const p of new Set([...a.tel, ...a.phonesInText])) {
      const e = ev({ field: "phone", value: p, sourceType: "website", sourceUrl: src, method: a.tel.includes(p) ? "ligação tel: no site" : "número em texto no site", status: identityOk ? "confirmed" : "inferred" });
      contacts.push({ kind: "phone", value: p, valueNorm: p, status: e.status, evidenceKey: e.key });
    }
    for (const m of a.emails) {
      const n = normalizeEmail(m);
      if (!n) continue;
      const e = ev({ field: "email", value: n, sourceType: "website", sourceUrl: src, method: "email publicado no site (não confirma que a caixa recebe mensagens)", status: identityOk ? "confirmed" : "inferred" });
      contacts.push({ kind: "email", value: n, valueNorm: n, status: e.status, evidenceKey: e.key });
    }
    for (const w of a.whatsapp) {
      const e = ev({ field: "whatsapp", value: w.url, sourceType: "website", sourceUrl: src, method: "ligação específica de WhatsApp no site", status: identityOk ? "confirmed" : "inferred" });
      contacts.push({ kind: "whatsapp", value: w.url, valueNorm: w.url.toLowerCase(), status: e.status, evidenceKey: e.key });
    }
    for (const s of a.social) {
      const e = ev({ field: s.kind, value: s.url, sourceType: "website", sourceUrl: src, method: "ligação para perfil a partir do site oficial", status: identityOk ? "confirmed" : "inferred" });
      contacts.push({ kind: s.kind, value: s.url, valueNorm: s.url.toLowerCase().replace(/\/$/, ""), status: e.status, evidenceKey: e.key });
    }
    if (a.hasForm) {
      const e = ev({ field: "contact_form", value: src, sourceType: "website", sourceUrl: src, method: "formulário com campo de email/mensagem detetado (não submetido)", status: "confirmed" });
      contacts.push({ kind: "contact_form", value: src, valueNorm: src, status: "confirmed", evidenceKey: e.key });
    }
  });

  // Sinais de atividade com data
  for (const a of all) for (const d of a.datedSignals) ev({ field: "activity", value: d.date, sourceType: "website", sourceUrl: finalUrl, method: d.source, status: "confirmed", details: { kind: "dated" } });
  if (h.copyrightYear) ev({ field: "activity", value: String(h.copyrightYear), sourceType: "website", sourceUrl: finalUrl, method: "ano no rodapé (©) — sinal fraco", status: "inferred", details: { kind: "copyright_year", current: h.copyrightYear === new Date().getFullYear() } });

  // Texto provisório visível (re-verificado com segundo pedido)
  if (h.placeholders.length) {
    const again = await safeFetch(finalUrl, fo);
    const confirmed = again.outcome === "ok" && analyzeHtml(again.body, finalUrl, input.companyName).placeholders.some((p) => p.pattern === h.placeholders[0].pattern);
    const e = ev({ field: "issue:placeholder", value: h.placeholders[0].excerpt, sourceType: "website", sourceUrl: finalUrl, method: `texto visível na página inicial; ${confirmed ? "confirmado em 2.º pedido" : "visto 1 vez"}`, status: "confirmed", details: { pattern: h.placeholders[0].pattern } });
    opportunities.push({ type: "placeholder_text", tier: "principal", verification: confirmed ? "reproduced" : "single_observation",
      observed: `Texto provisório visível na página inicial (${h.placeholders[0].pattern}): "…${h.placeholders[0].excerpt}…"`,
      possibleImpact: "Pode transmitir que o site não está terminado.", suggestedImprovement: "Substituir por conteúdo real e rever as restantes páginas.", evidenceKeys: [e.key] });
  }

  // Ligações de marcação: verificar destino (GET; nunca submeter)
  for (const b of all.flatMap((a) => a.booking).slice(0, 3)) {
    const r = await fetchWithRetries(b.url, { ...fo, attempts: 2, delayMs: deps.retryDelayMs, maxBytes: 300_000 });
    pages.push({ url: b.url, outcome: r.last.outcome, status: r.last.status, fetchedAt: r.last.fetchedAt });
    const broken = r.last.outcome === "dns_not_found" || (r.last.outcome === "http_error" && r.last.status != null && (r.last.status === 404 || r.last.status === 410 || r.last.status >= 500));
    if (broken) {
      const e = ev({ field: "issue:booking_link", value: r.last.status ? `HTTP ${r.last.status}` : r.last.outcome, sourceType: "website", sourceUrl: b.url, method: `ligação de marcação "${b.text}"; ${r.results.length} tentativa(s); apenas pedido GET`, status: r.reproduced ? "confirmed" : "inferred" });
      opportunities.push({ type: "booking_link_error", tier: "principal", verification: r.reproduced ? "reproduced" : "single_observation",
        observed: `A ligação de marcação "${b.text}" (${b.url}) devolve ${r.last.status ? "HTTP " + r.last.status : "erro de DNS"}.`,
        possibleImpact: "Quem tenta marcar pelo site pode não conseguir.", suggestedImprovement: "Corrigir o destino da marcação ou ligar a uma plataforma de marcação ativa.", evidenceKeys: [e.key] });
    } else if (r.last.outcome === "ok") {
      ev({ field: "booking", value: b.url, sourceType: "website", sourceUrl: b.url, method: "ligação de marcação responde (verificação de disponibilidade apenas; nenhuma marcação feita)", status: "confirmed" });
      contacts.push({ kind: "booking", value: b.url, valueNorm: b.url.toLowerCase(), status: "confirmed", evidenceKey: evidences[evidences.length - 1].key });
    } else inconclusive++;
  }

  // Botão de ação sem destino
  const wrong = h.wrongCtas[0];
  if (wrong) {
    const e = ev({ field: "issue:cta", value: `${wrong.text} → ${wrong.href || "(vazio)"}`, sourceType: "website", sourceUrl: finalUrl, method: "análise estrutural do HTML (sem clique)", status: "confirmed", details: { reason: wrong.reason } });
    opportunities.push({ type: "cta_wrong_destination", tier: "obstacle", verification: "visual_structural",
      observed: `O botão "${wrong.text}" na página inicial não tem destino útil (${wrong.reason}). Verificação estrutural: pode existir JavaScript que o trate.`,
      possibleImpact: "Quem clica pode não chegar ao contacto ou marcação.", suggestedImprovement: "Ligar o botão ao contacto, telefone ou marcação.", evidenceKeys: [e.key] });
  }

  const hasContactPath = sitePhones.size > 0 || all.some((a) => a.emails.length || a.whatsapp.length || a.hasForm || a.booking.length) || !!contactPage;
  if (!hasContactPath) {
    const e = ev({ field: "issue:no_contact", value: null, sourceType: "website", sourceUrl: finalUrl, method: "página inicial e páginas ligadas analisadas (HTML estático)", status: "not_found" });
    opportunities.push({ type: "no_contact_path", tier: "obstacle", verification: "visual_structural",
      observed: "Não foi encontrado telefone, email, WhatsApp, formulário ou página de contactos na página inicial nem nas páginas ligadas analisadas (o conteúdo carregado por JavaScript não foi avaliado).",
      possibleImpact: "Pode ser difícil contactar a empresa a partir do site.", suggestedImprovement: "Tornar os contactos visíveis em todas as páginas.", evidenceKeys: [e.key] });
  }
  if (!h.hasViewport) {
    const e = ev({ field: "issue:viewport", value: null, sourceType: "website", sourceUrl: finalUrl, method: "meta viewport ausente no HTML", status: "not_found" });
    opportunities.push({ type: "no_viewport", tier: "minor", verification: "visual_structural", observed: "A página inicial não declara meta viewport para ecrãs móveis.",
      possibleImpact: "Em telemóvel o texto pode aparecer reduzido.", suggestedImprovement: "Adaptar o layout a telemóvel.", evidenceKeys: [e.key] });
  }
  if (finalUrl.startsWith("http:")) {
    const e = ev({ field: "issue:https", value: finalUrl, sourceType: "website", sourceUrl: finalUrl, method: "URL final servido sem HTTPS", status: "confirmed" });
    opportunities.push({ type: "no_https", tier: "minor", verification: "reproduced", observed: `O site é servido sem HTTPS (${finalUrl}).`,
      possibleImpact: "Os navegadores marcam a página como \"não segura\".", suggestedImprovement: "Ativar HTTPS com redireção.", evidenceKeys: [e.key] });
  }

  // Ecrã móvel
  let mobile: MobileCheck | null = null;
  if (deps.mobile !== false) {
    mobile = await (deps.checkMobileFn ?? checkMobile)(finalUrl, { addressPolicy: fo.addressPolicy, allowedPorts: fo.allowedPorts });
    if (mobile.available && !mobile.error) {
      tools.push({ tool: `${mobile.tool} ${mobile.viewport.width}×${mobile.viewport.height}`, at: mobile.checkedAt });
      const m = mobile.menu;
      if (m && m.navLinksInDom > 0 && m.visibleNavLinks === 0 && (!m.toggleVisible || m.toggleRevealsLinks === false)) {
        const e = ev({ field: "issue:mobile_menu", value: JSON.stringify(m), sourceType: "playwright", sourceUrl: finalUrl, method: "navegador automatizado em ecrã móvel; verificação visual/estrutural", status: "confirmed" });
        opportunities.push({ type: "mobile_menu_inaccessible", tier: "obstacle", verification: "visual_structural",
          observed: m.toggleVisible ? "Em telemóvel o botão do menu não revela as ligações de navegação." : "Em telemóvel as ligações do menu ficam ocultas e não há botão de menu visível.",
          possibleImpact: "Visitantes em telemóvel podem não conseguir navegar até aos serviços ou contactos.", suggestedImprovement: "Corrigir o menu responsivo.", evidenceKeys: [e.key] });
      }
      if (mobile.overlappedContacts?.length) {
        const o = mobile.overlappedContacts[0];
        const e = ev({ field: "issue:overlap", value: `${o.href} coberto por ${o.coveredBy}`, sourceType: "playwright", sourceUrl: finalUrl, method: "elementFromPoint no centro da ligação de contacto (ecrã móvel)", status: "confirmed" });
        opportunities.push({ type: "contact_overlapped", tier: "obstacle", verification: "visual_structural",
          observed: `Em telemóvel a ligação de contacto ${o.href} está coberta por outro elemento (${o.coveredBy}).`,
          possibleImpact: "O toque pode não chegar à ligação de contacto.", suggestedImprovement: "Ajustar sobreposições/elementos fixos no telemóvel.", evidenceKeys: [e.key] });
      }
      if ((mobile.horizontalOverflowPx ?? 0) > 20) {
        const e = ev({ field: "issue:overflow", value: `${mobile.horizontalOverflowPx}px`, sourceType: "playwright", sourceUrl: finalUrl, method: "scrollWidth vs largura do ecrã móvel", status: "confirmed" });
        opportunities.push({ type: "mobile_overflow", tier: "minor", verification: "visual_structural", observed: `Em telemóvel a página excede a largura do ecrã em ${mobile.horizontalOverflowPx}px (deslocamento horizontal).`,
          possibleImpact: "Leitura menos confortável em telemóvel.", suggestedImprovement: "Corrigir elementos que excedem a largura.", evidenceKeys: [e.key] });
      }
    } else if (mobile.available && mobile.error) inconclusive++;
  }

  const offers = all.some((a) => a.offersWebdev);
  return {
    url: input.url, finalUrl, outcome: "ok", httpStatus: last.status, attempts: home.results.length,
    websiteStatus: identityOk ? "confirmed" : "conflict",
    identity: { nameOnSite, phoneMatch, localityOnSite, postcodes }, evidences, contacts, opportunities, pages, mobile, tools,
    agencyOffersWebdev: input.isAgency ? offers : null, inconclusiveChecks: inconclusive, textSample: h.textSample,
  };

  function emptyResult(outcome: SafeFetchResult["outcome"] | "disallowed_by_robots", websiteStatus: SiteResult["websiteStatus"]): SiteResult {
    return {
      url: input.url, finalUrl: input.url, outcome: outcome as SafeFetchResult["outcome"], httpStatus: home?.last.status ?? null, attempts: home?.results.length ?? 0,
      websiteStatus, identity: { nameOnSite: false, phoneMatch: false, localityOnSite: false, postcodes: [] }, evidences, contacts, opportunities, pages, mobile: null, tools,
      agencyOffersWebdev: null, inconclusiveChecks: inconclusive, textSample: null,
    };
  }
}
