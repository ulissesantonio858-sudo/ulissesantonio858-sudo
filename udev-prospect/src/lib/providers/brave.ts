import type { UsageGuard, WebSearchProvider, WebSearchResult } from "./types";
import { ProviderNotConfiguredError } from "./types";

/*
 * Brave Search API — GET https://api.search.brave.com/res/v1/web/search, cabeçalho X-Subscription-Token.
 * O cabeçalho X-RateLimit-Remaining informa a quota restante (por janela) e é mostrado nas Configurações.
 * Os resultados não são guardados em cache: só se guarda a consulta, a data, o número de resultados
 * e os URLs que o próprio sistema verificou depois.
 */
const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export function braveProvider(opts: { apiKey?: string; fetchImpl?: typeof fetch } = {}): WebSearchProvider {
  const apiKey = opts.apiKey ?? process.env.BRAVE_SEARCH_API_KEY;
  const f = opts.fetchImpl ?? fetch;
  return {
    id: "brave",
    label: "Brave Search API",
    configured: () => !!apiKey,
    async search(query: string, guard: UsageGuard, count = 10): Promise<WebSearchResult[]> {
      if (!apiKey) throw new ProviderNotConfiguredError("brave");
      await guard.consume("brave");
      const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&country=PT&count=${Math.min(count, 20)}`;
      const res = await f(url, { headers: { Accept: "application/json", "X-Subscription-Token": apiKey }, signal: AbortSignal.timeout(15_000) });
      await guard.report("brave", res.headers.get("x-ratelimit-remaining"));
      if (!res.ok) throw new Error(`Brave Search HTTP ${res.status}`);
      const data = (await res.json()) as { web?: { results?: { url: string; title: string }[] } };
      return (data.web?.results ?? []).map((r) => ({ url: r.url, title: r.title }));
    },
  };
}
