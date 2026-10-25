// Normalização determinística de identificadores usados na deduplicação e na verificação de identidade.

const LEGAL_SUFFIXES = /\b(lda|lda\.|unipessoal|sa|s\.a\.|limitada|sociedade|soc)\b/g;
const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "the"]);

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Nome comparável: minúsculas, sem acentos, sem forma jurídica, sem pontuação. */
export function normalizeName(name: string): string {
  return stripAccents(name.toLowerCase())
    .replace(/&/g, " e ")
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ")
    .trim();
}

export function nameTokens(name: string): string[] {
  return normalizeName(name).split(" ").filter((t) => t.length >= 2);
}

/** Semelhança de Jaccard entre tokens dos nomes (0..1). */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/** O texto da página contém o nome da empresa (todos os tokens distintivos)? */
export function textMentionsName(text: string, name: string): boolean {
  const hay = " " + normalizeName(text) + " ";
  const tokens = nameTokens(name).filter((t) => t.length >= 3);
  if (!tokens.length) return false;
  return tokens.every((t) => hay.includes(" " + t + " "));
}

export function normalizeLocality(s: string | null | undefined): string | null {
  if (!s) return null;
  const n = stripAccents(s.toLowerCase()).replace(/[^a-z0-9]+/g, " ").trim();
  return n || null;
}

/** Telefone português para E.164. Devolve null se não for reconhecível. */
export function normalizePhonePT(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("+")) {
    const digits = d.slice(1);
    if (!/^\d{8,15}$/.test(digits)) return null;
    if (digits.startsWith("351") && digits.length !== 12) return null;
    return "+" + digits;
  }
  // Números nacionais PT têm 9 dígitos e começam por 2 (fixo), 3 (nómada) ou 9 (móvel)
  if (/^[239]\d{8}$/.test(d)) return "+351" + d;
  return null;
}

export function isMobilePT(e164: string): boolean {
  return /^\+3519[1236]\d{7}$/.test(e164);
}

/** Domínios de plataformas partilhadas: não identificam uma empresa por si só. */
const SHARED_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "wa.me", "whatsapp.com", "google.com", "goo.gl",
  "linktr.ee", "tiktok.com", "youtube.com", "twitter.com", "x.com", "booking.com", "tripadvisor.com",
  "tripadvisor.pt", "thefork.pt", "thefork.com", "zomato.com", "fresha.com", "treatwell.pt", "booksy.com",
  "doctoralia.pt", "sites.google.com", "business.site", "wixsite.com", "negocio.site", "uber.com", "glovoapp.com",
];

export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Domínio identificativo da empresa, ou null para plataformas partilhadas. */
export function companyDomain(url: string | null | undefined): string | null {
  const n = normalizeUrl(url);
  if (!n) return null;
  const h = hostOf(n);
  if (!h) return null;
  if (SHARED_HOSTS.some((s) => h === s || h.endsWith("." + s))) return null;
  // Um endereço IP não identifica uma empresa
  if (/^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return null;
  return h;
}

export function isSharedPlatform(url: string): boolean {
  const n = normalizeUrl(url);
  const h = n ? hostOf(n) : null;
  return !!h && SHARED_HOSTS.some((s) => h === s || h.endsWith("." + s));
}

export function extractPostcodePT(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\b(\d{4})-(\d{3})\b/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) return null;
  // Exclui padrões de ficheiros e exemplos frequentes em temas
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(e) || /@(example|exemplo|domain|seudominio|email)\./.test(e)) return null;
  return e;
}
