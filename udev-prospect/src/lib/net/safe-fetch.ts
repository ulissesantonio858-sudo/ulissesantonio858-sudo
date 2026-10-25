import dns from "node:dns";
import { Agent, fetch as undiciFetch, type Dispatcher } from "undici";
import { isPublicAddress } from "./ip";

export type FetchOutcome =
  | "ok" | "http_error" | "dns_not_found" | "dns_error" | "timeout" | "connection_refused" | "connection_error"
  | "tls_error" | "blocked" | "captcha" | "unsafe_url" | "insecure_redirect" | "too_many_redirects" | "too_large"
  | "disallowed_by_robots";

export interface SafeFetchResult {
  url: string;
  finalUrl: string;
  outcome: FetchOutcome;
  status: number | null;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
  redirects: string[];
  error: string | null;
  elapsedMs: number;
  fetchedAt: string;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  method?: "GET" | "HEAD";
  userAgent?: string;
  /** Política de endereços. Por defeito só permite IPs públicos. Os testes injetam outra política. */
  addressPolicy?: (ip: string) => boolean;
  /** Portas permitidas (por defeito 80/443). */
  allowedPorts?: string[];
}

export const DEFAULT_UA = "UDEV-Prospect/0.1 (verificação manual de sites públicos; sem envio de formulários)";

/** Valida um URL antes de qualquer pedido. Devolve motivo de bloqueio ou null. */
export function validateUrl(raw: string, opts: Pick<SafeFetchOptions, "addressPolicy" | "allowedPorts"> = {}): string | null {
  let u: URL;
  try { u = new URL(raw); } catch { return "URL inválido"; }
  if (!["http:", "https:"].includes(u.protocol)) return `protocolo não permitido (${u.protocol})`;
  if (u.username || u.password) return "credenciais no URL não são permitidas";
  const ports = opts.allowedPorts ?? ["", "80", "443"];
  if (!ports.includes(u.port)) return `porta não permitida (${u.port})`;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    return "anfitrião local não permitido";
  const policy = opts.addressPolicy ?? isPublicAddress;
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (!policy(host)) return "endereço IP privado ou reservado";
  }
  return null;
}

function makeLookup(policy: (ip: string) => boolean) {
  return (hostname: string, options: dns.LookupOptions, cb: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return cb(err, "", 0);
      const list = addresses as dns.LookupAddress[];
      // Rejeita se QUALQUER endereço resolvido for privado (evita DNS rebinding misto)
      const bad = list.find((a) => !policy(a.address));
      if (bad || !list.length) {
        const e = new Error(`endereço resolvido não permitido (${bad?.address ?? "nenhum"})`) as NodeJS.ErrnoException;
        e.code = "EUNSAFEADDR";
        return cb(e, "", 0);
      }
      if ((options as { all?: boolean }).all) return cb(null, list);
      cb(null, list[0].address, list[0].family);
    });
  };
}

const agents = new Map<(ip: string) => boolean, Dispatcher>();
function agentFor(policy: (ip: string) => boolean): Dispatcher {
  let a = agents.get(policy);
  if (!a) {
    a = new Agent({ connect: { lookup: makeLookup(policy) as never, timeout: 10_000 }, headersTimeout: 15_000, bodyTimeout: 15_000 });
    agents.set(policy, a);
  }
  return a;
}

function errorCode(e: unknown): string {
  const err = e as { code?: string | number; cause?: { code?: string; message?: string; name?: string }; name?: string; message?: string };
  // DOMException de AbortSignal.timeout() tem code numérico; o nome é o que interessa
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return err.name;
  if (err?.cause?.name === "TimeoutError" || err?.cause?.name === "AbortError") return err.cause.name;
  return err?.cause?.code ?? (typeof err?.code === "string" ? err.code : "") ?? err?.name ?? "";
}

export function classifyError(e: unknown): { outcome: FetchOutcome; message: string } {
  const code = errorCode(e);
  const msg = (e as Error)?.message ?? String(e);
  const causeMsg = (e as { cause?: { message?: string } })?.cause?.message ?? "";
  if (code === "EUNSAFEADDR" || causeMsg.includes("não permitido")) return { outcome: "unsafe_url", message: causeMsg || msg };
  if (code === "ENOTFOUND") return { outcome: "dns_not_found", message: "domínio não resolve (ENOTFOUND)" };
  if (code === "EAI_AGAIN") return { outcome: "dns_error", message: "falha temporária de DNS" };
  if (code === "ECONNREFUSED") return { outcome: "connection_refused", message: "ligação recusada" };
  if (code === "TimeoutError" || code === "AbortError" || code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT")
    return { outcome: "timeout", message: "tempo limite excedido" };
  if (/CERT|SSL|TLS|ERR_TLS/i.test(code) || /certificate/i.test(causeMsg)) return { outcome: "tls_error", message: `erro TLS (${code})` };
  return { outcome: "connection_error", message: `${code || "erro"}: ${causeMsg || msg}`.slice(0, 300) };
}

const CHALLENGE_MARKERS = [/cf-chl-|challenge-platform|cf_chl_opt/i, /captcha/i, /attention required!? \| cloudflare/i, /ddos-guard/i, /access denied/i];

export function detectBlock(status: number, headers: Record<string, string>, body: string): "captcha" | "blocked" | null {
  const server = (headers["server"] ?? "").toLowerCase();
  if ([403, 429, 503].includes(status)) {
    if (/captcha|recaptcha|hcaptcha|turnstile/i.test(body)) return "captcha";
    if (CHALLENGE_MARKERS.some((r) => r.test(body)) || server.includes("cloudflare") || headers["cf-mitigated"]) return "blocked";
    if (status === 429) return "blocked";
  }
  if (status === 200 && /cf-chl-|challenge-platform/i.test(body) && /turnstile|captcha/i.test(body)) return "captcha";
  return null;
}

async function readLimited(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      chunks.push(value.slice(0, value.byteLength - (size - maxBytes)));
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks)), truncated };
}

/** GET/HEAD seguro: valida cada salto, bloqueia IPs privados, limita tempo, tamanho e redireções. */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const maxBytes = opts.maxBytes ?? 2_000_000;
  const maxRedirects = opts.maxRedirects ?? 5;
  const policy = opts.addressPolicy ?? isPublicAddress;
  const redirects: string[] = [];
  const base = (over: Partial<SafeFetchResult>): SafeFetchResult => ({
    url: rawUrl, finalUrl: current, outcome: "ok", status: null, headers: {}, body: "", truncated: false, redirects,
    error: null, elapsedMs: Date.now() - started, fetchedAt: new Date(started).toISOString(), ...over,
  });
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const invalid = validateUrl(current, { addressPolicy: policy, allowedPorts: opts.allowedPorts });
    if (invalid) return base({ outcome: "unsafe_url", error: invalid });
    let res: Response;
    try {
      res = (await undiciFetch(current, {
        method: opts.method ?? "GET",
        redirect: "manual",
        dispatcher: agentFor(policy),
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": opts.userAgent ?? DEFAULT_UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "pt-PT,pt;q=0.9" },
      })) as unknown as Response;
    } catch (e) {
      const c = classifyError(e);
      return base({ outcome: c.outcome, error: c.message });
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    if (res.status >= 300 && res.status < 400 && headers["location"]) {
      const next = new URL(headers["location"], current).toString();
      if (current.startsWith("https:") && next.startsWith("http:"))
        return base({ outcome: "insecure_redirect", status: res.status, headers, error: `redireção de HTTPS para HTTP (${next}) não seguida` });
      redirects.push(next);
      await res.body?.cancel().catch(() => {});
      current = next;
      continue;
    }
    let text = "";
    let truncated = false;
    try {
      ({ text, truncated } = opts.method === "HEAD" ? { text: "", truncated: false } : await readLimited(res, maxBytes));
    } catch (e) {
      const c = classifyError(e);
      return base({ outcome: c.outcome, status: res.status, headers, error: c.message });
    }
    const block = detectBlock(res.status, headers, text);
    if (block) return base({ outcome: block, status: res.status, headers, body: text, truncated, error: `pedido bloqueado/desafio (${res.status})` });
    if (res.status >= 400) return base({ outcome: "http_error", status: res.status, headers, body: text, truncated, error: `HTTP ${res.status}` });
    return base({ outcome: "ok", status: res.status, headers, body: text, truncated });
  }
  return base({ outcome: "too_many_redirects", error: `mais de ${maxRedirects} redireções` });
}

const TRANSIENT: FetchOutcome[] = ["timeout", "connection_error", "dns_error", "connection_refused"];

/** Repete verificações limitadas. Uma falha só é "reproduzida" se ocorrer em todas as tentativas. */
export async function fetchWithRetries(url: string, opts: SafeFetchOptions & { attempts?: number; delayMs?: number } = {}) {
  const attempts = Math.max(1, Math.min(opts.attempts ?? 2, 3));
  const results: SafeFetchResult[] = [];
  for (let i = 0; i < attempts; i++) {
    const r = await safeFetch(url, opts);
    results.push(r);
    if (r.outcome === "ok" || r.outcome === "unsafe_url" || r.outcome === "blocked" || r.outcome === "captcha" || r.outcome === "insecure_redirect") break;
    if (r.outcome === "http_error" && r.status && r.status < 500 && r.status !== 408 && i >= 1) break;
    if (i < attempts - 1) await new Promise((res) => setTimeout(res, (opts.delayMs ?? 1500) * (i + 1)));
  }
  const last = results[results.length - 1];
  const reproduced = results.length >= 2 && results.every((r) => r.outcome === last.outcome && r.status === last.status);
  return { last, results, reproduced, transient: TRANSIENT.includes(last.outcome) };
}
