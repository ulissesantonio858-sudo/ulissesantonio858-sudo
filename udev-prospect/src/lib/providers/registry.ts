import { anthropicProvider, type AiProvider } from "./ai";
import { braveProvider } from "./brave";
import { googlePlacesProvider } from "./google-places";
import { osmProvider } from "./osm";
import type { DiscoveryProvider, WebSearchProvider } from "./types";

export interface Providers {
  discovery: DiscoveryProvider[];
  webSearch: WebSearchProvider | null;
  ai: AiProvider | null;
}

/** Fornecedores ativos conforme as variáveis de ambiente. Trocar de fornecedor = trocar o adaptador aqui. */
export function getProviders(): Providers {
  return {
    discovery: [googlePlacesProvider({ includeReviews: process.env.PLACES_INCLUDE_REVIEWS === "true" }), osmProvider()],
    webSearch: braveProvider(),
    ai: anthropicProvider(),
  };
}

export interface IntegrationStatus { id: string; label: string; configured: boolean; purpose: string; envVar: string; notes: string }

export function integrationStatus(): IntegrationStatus[] {
  const p = getProviders();
  const mobile = (() => { try { require.resolve("playwright"); return true; } catch { return false; } })();
  return [
    { id: "database", label: "Base de dados (Postgres/Supabase)", configured: !!process.env.DATABASE_URL, purpose: "Persistência e RLS", envVar: "DATABASE_URL", notes: "" },
    { id: "auth", label: "Autenticação", configured: process.env.AUTH_MODE === "supabase" || (process.env.AUTH_MODE !== "local" && !!process.env.NEXT_PUBLIC_SUPABASE_URL)
        ? !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        : !!process.env.APP_LOGIN_EMAIL && (process.env.APP_PASSWORD ?? "").length >= 10,
      purpose: "Acesso privado", envVar: "APP_LOGIN_EMAIL / APP_PASSWORD (local) ou Supabase", notes: "Modo local por defeito no Docker." },
    { id: "google_places", label: p.discovery[0].label, configured: p.discovery[0].configured(), purpose: "Descoberta de empresas locais", envVar: "GOOGLE_PLACES_API_KEY", notes: "Só o place_id é guardado sem prazo; restante conteúdo expira." },
    { id: "osm", label: p.discovery[1].label, configured: p.discovery[1].configured(), purpose: "Descoberta sem chave (cobertura variável)", envVar: "OSM_ENABLED", notes: "© contribuidores OpenStreetMap (ODbL)" },
    { id: "brave", label: p.webSearch!.label, configured: p.webSearch!.configured(), purpose: "Pesquisa do site pelo nome e localidade", envVar: "BRAVE_SEARCH_API_KEY", notes: "Sem esta chave o estado fica «não verificado» em vez de «site não localizado»." },
    { id: "anthropic", label: p.ai!.label, configured: p.ai!.configured(), purpose: "Sugestão de nicho (opcional)", envVar: "ANTHROPIC_API_KEY", notes: "Opcional: sem chave usa só regras." },
    { id: "playwright", label: "Playwright (Chromium)", configured: mobile, purpose: "Análise em ecrã móvel", envVar: "—", notes: "Incluído na imagem Docker do worker." },
  ];
}
