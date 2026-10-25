import * as cheerio from "cheerio";
import { normalizeEmail, normalizePhonePT, stripAccents, textMentionsName, extractPostcodePT } from "../domain/normalize";

export interface LinkInfo { url: string; text: string }
export interface HtmlAnalysis {
  title: string | null;
  hasViewport: boolean;
  generator: string | null;
  placeholders: { pattern: string; excerpt: string }[];
  tel: string[];
  emails: string[];
  phonesInText: string[];
  whatsapp: LinkInfo[];
  social: { kind: "instagram" | "facebook" | "linkedin"; url: string }[];
  booking: LinkInfo[];
  contactPages: LinkInfo[];
  servicePages: LinkInfo[];
  hasForm: boolean;
  wrongCtas: { text: string; href: string; reason: string }[];
  copyrightYear: number | null;
  datedSignals: { date: string; source: string }[];
  mentionsName: boolean;
  postcodes: string[];
  offersWebdev: boolean;
  textSample: string;
}

const PLACEHOLDER_PATTERNS: [string, RegExp][] = [
  ["lorem ipsum", /lorem ipsum/i],
  ["tema WordPress por omissão", /just another wordpress site|mais um site wordpress|apenas mais um site wordpress/i],
  ["publicação de exemplo", /\bhello world!|\bol[aá],? mundo!/i],
  ["página de exemplo", /\bsample page\b|\bp[aá]gina de exemplo\b/i],
  ["site em construção", /\b(site|p[aá]gina|website) em constru[cç][aã]o\b|\bunder construction\b|\bcoming soon\b|\bbrevemente online\b/i],
  ["texto modelo", /\byour company name\b|\binsert (your )?text here\b|\binsira (aqui )?o seu texto\b|\bedit this text\b|\badd your heading text here\b/i],
];

const BOOKING_HOSTS = ["fresha.com", "treatwell.", "booksy.com", "doctoralia.", "calendly.com", "thefork.", "simplybook.", "setmore.com", "agendapro.", "reservio.", "tuotempo.", "zappysoftware.", "buk.pt", "covermanager.com", "booking.com"];
const BOOKING_WORDS = /\b(marcar|marca[cç][aã]o|marca[cç][oõ]es|agendar|agendamento|reservar|reserva[rs]?|book now|booking|marque j[aá])\b/i;
const CONTACT_WORDS = /\b(contacto|contactos|contato|contatos|contact|fale connosco|onde estamos)\b/i;
const SERVICE_WORDS = /\b(servi[cç]os|tratamentos|especialidades|[aá]reas de pr[aá]tica|menu|ementa|carta|modalidades|aulas|pre[cç]os)\b/i;
const CTA_WORDS = /\b(marcar|agendar|reservar|contacte|contacte-nos|ligue|pedir or[cç]amento|marque|fale connosco|whatsapp)\b/i;
const WEBDEV_WORDS = /\b(cria[cç][aã]o de (sites|websites|lojas online)|desenvolvimento (web|de sites|de websites)|web ?design|websites|lojas online|e-?commerce|wordpress)\b/i;

function abs(href: string, base: string): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

export function analyzeHtml(html: string, pageUrl: string, companyName: string): HtmlAnalysis {
  const $ = cheerio.load(html);
  const jsonLd: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { jsonLd.push(JSON.parse($(el).text())); } catch { /* ignorar JSON-LD inválido */ }
  });
  $("script, style, noscript, template, svg").remove();
  // Separar blocos com espaços antes de extrair texto (evita "email@x.ptTel." colado)
  const spacedHtml = ($("body").html() ?? "").replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|td|th|tr|table|section|article|header|footer|nav|span|a|strong|em|b|i|label|button|address|small)\b[^>]*>/gi, " ");
  const text = cheerio.load(`<body>${spacedHtml}</body>`)("body").text().replace(/\s+/g, " ").trim();
  const origin = new URL(pageUrl).origin;

  const tel = new Set<string>();
  const emails = new Set<string>();
  const whatsapp: LinkInfo[] = [];
  const social: HtmlAnalysis["social"] = [];
  const booking: LinkInfo[] = [];
  const contactPages: LinkInfo[] = [];
  const servicePages: LinkInfo[] = [];
  const wrongCtas: HtmlAnalysis["wrongCtas"] = [];

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const t = $(el).text().replace(/\s+/g, " ").trim() || ($(el).attr("aria-label") ?? "");
    if (/^tel:/i.test(href)) { const p = normalizePhonePT(decodeURIComponent(href.slice(4))); if (p) tel.add(p); return; }
    if (/^mailto:/i.test(href)) { const e = normalizeEmail(decodeURIComponent(href)); if (e) emails.add(e); return; }
    const u = abs(href, pageUrl);
    const lower = (u ?? href).toLowerCase();
    if (/wa\.me\/|api\.whatsapp\.com\/send|whatsapp:\/\/send|web\.whatsapp\.com\/send/.test(lower)) { whatsapp.push({ url: u ?? href, text: t }); return; }
    if (u) {
      if (/instagram\.com\/[^/?#]+/.test(lower) && !/instagram\.com\/(p|explore|accounts)\//.test(lower)) social.push({ kind: "instagram", url: u });
      else if (/facebook\.com\/[^/?#]+/.test(lower) && !/sharer|share\.php|dialog/.test(lower)) social.push({ kind: "facebook", url: u });
      else if (/linkedin\.com\/(company|in)\//.test(lower)) social.push({ kind: "linkedin", url: u });
    }
    const isBookingHost = BOOKING_HOSTS.some((h) => lower.includes(h));
    if (u && (isBookingHost || (BOOKING_WORDS.test(t) && !/^#/.test(href)))) booking.push({ url: u, text: t });
    if (u && u.startsWith(origin)) {
      if (CONTACT_WORDS.test(t) || /\/(contact|contacto|contactos|contatos)/.test(lower)) contactPages.push({ url: u, text: t });
      else if (SERVICE_WORDS.test(t)) servicePages.push({ url: u, text: t });
    }
    // Botão de ação principal sem destino útil (verificação estrutural, sem clicar)
    if (CTA_WORDS.test(t)) {
      if (href === "#" || href === "" || /^javascript:\s*(void\(0\)|;)?\s*$/i.test(href)) {
        const hasHandler = $(el).attr("onclick") || $(el).attr("data-toggle") || $(el).attr("data-bs-toggle") || $(el).attr("role") === "button";
        if (!hasHandler) wrongCtas.push({ text: t, href, reason: "ligação sem destino" });
      } else if (href.startsWith("#") && href.length > 1) {
        const id = href.slice(1);
        if (!$(`[id="${id.replace(/"/g, "")}"], a[name="${id.replace(/"/g, "")}"]`).length) wrongCtas.push({ text: t, href, reason: `âncora ${href} inexistente na página` });
      }
    }
  });

  // Emails e telefones publicados em texto visível (não são adivinhados: têm de constar na página)
  for (const m of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) { const e = normalizeEmail(m[0]); if (e) emails.add(e); }
  const phonesInText = new Set<string>();
  for (const m of text.matchAll(/(?:\+351[\s.]?)?\b[239]\d{2}[\s.]?\d{3}[\s.]?\d{3}\b/g)) { const p = normalizePhonePT(m[0]); if (p) phonesInText.add(p); }

  const placeholders: HtmlAnalysis["placeholders"] = [];
  for (const [label, re] of PLACEHOLDER_PATTERNS) {
    const m = text.match(re);
    if (m && m.index != null) placeholders.push({ pattern: label, excerpt: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40) });
  }

  const datedSignals: HtmlAnalysis["datedSignals"] = [];
  const collect = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(collect);
    const o = node as Record<string, unknown>;
    for (const k of ["dateModified", "datePublished"]) {
      const v = o[k];
      if (typeof v === "string" && !isNaN(Date.parse(v))) datedSignals.push({ date: new Date(v).toISOString(), source: `JSON-LD ${k}` });
    }
    if (o["@graph"]) collect(o["@graph"]);
  };
  jsonLd.forEach(collect);
  const metaTimes = ["article:modified_time", "article:published_time", "og:updated_time"];
  for (const p of metaTimes) {
    const v = $(`meta[property="${p}"]`).attr("content");
    if (v && !isNaN(Date.parse(v))) datedSignals.push({ date: new Date(v).toISOString(), source: `meta ${p}` });
  }
  $("time[datetime]").slice(0, 10).each((_, el) => {
    const v = $(el).attr("datetime");
    if (v && /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v))) datedSignals.push({ date: new Date(v).toISOString(), source: "elemento <time> na página" });
  });

  const cr = text.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/i);
  const generator = $('meta[name="generator"]').attr("content") ?? null;

  return {
    title: $("title").first().text().trim() || null,
    hasViewport: /width\s*=\s*device-width/i.test($('meta[name="viewport"]').attr("content") ?? ""),
    generator,
    placeholders,
    tel: [...tel],
    emails: [...emails].filter((e) => !e.endsWith("@sentry.io") && !e.includes("wixpress")),
    phonesInText: [...phonesInText],
    whatsapp,
    social: dedupe(social, (s) => s.url),
    booking: dedupe(booking, (b) => b.url),
    contactPages: dedupe(contactPages, (c) => c.url).slice(0, 3),
    servicePages: dedupe(servicePages, (c) => c.url).slice(0, 5),
    hasForm: $("form").filter((_, f) => $(f).find("textarea, input[type=email]").length > 0).length > 0,
    wrongCtas: dedupe(wrongCtas, (w) => w.text + w.href).slice(0, 5),
    copyrightYear: cr ? Number(cr[1]) : null,
    datedSignals,
    mentionsName: textMentionsName(($("title").text() + " " + text).slice(0, 200_000), companyName),
    postcodes: [...new Set([...text.matchAll(/\b\d{4}-\d{3}\b/g)].map((m) => extractPostcodePT(m[0])!).filter(Boolean))],
    offersWebdev: WEBDEV_WORDS.test(text),
    textSample: text.slice(0, 4000),
  };

  function dedupe<T>(arr: T[], key: (x: T) => string): T[] {
    const seen = new Set<string>();
    return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
  }
}

export function mentionsLocality(text: string, locality: string): boolean {
  const n = (s: string) => " " + stripAccents(s.toLowerCase()).replace(/[^a-z0-9]+/g, " ") + " ";
  return n(text).includes(n(locality));
}
