import type { GeoPoint } from "../domain/geo";

export interface DiscoveryCandidate {
  source: "google_places" | "osm";
  externalId: string;
  name: string;
  address: string | null;
  locality: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  types: string[];
  osmTags?: Record<string, string>;
  businessStatus: "operational" | "closed_temporarily" | "closed_permanently" | "unknown";
  mapsUrl: string | null;
  latestReviewAt?: string | null;
  query: string;
}

export interface DiscoveryQuery {
  query: string;       // ex.: "clínica dentária em Vila Real"
  nicheKey: string;
  center: GeoPoint;
  radiusKm: number;
  maxResults: number;
}

export interface UsageGuard {
  /** Reserva n pedidos para o fornecedor; lança QuotaExceededError se ultrapassar o limite configurado. */
  consume(provider: string, n?: number): Promise<void>;
  report(provider: string, remaining: string | null): Promise<void>;
}

export class QuotaExceededError extends Error {
  constructor(public provider: string, public limit: number) {
    super(`Limite diário de ${limit} pedidos atingido para ${provider}`);
  }
}

export class ProviderNotConfiguredError extends Error {
  constructor(public provider: string) {
    super(`Integração ${provider} não configurada`);
  }
}

export interface DiscoveryProvider {
  id: "google_places" | "osm";
  label: string;
  attribution: string;
  configured(): boolean;
  search(q: DiscoveryQuery, guard: UsageGuard): Promise<DiscoveryCandidate[]>;
}

export interface WebSearchResult { url: string; title: string }
export interface WebSearchProvider {
  id: string;
  label: string;
  configured(): boolean;
  search(query: string, guard: UsageGuard, count?: number): Promise<WebSearchResult[]>;
}
