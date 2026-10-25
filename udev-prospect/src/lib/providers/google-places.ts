import { extractPostcodePT } from "../domain/normalize";
import type { DiscoveryCandidate, DiscoveryProvider, DiscoveryQuery, UsageGuard } from "./types";
import { ProviderNotConfiguredError } from "./types";

/*
 * Google Places API (New) — Text Search: POST https://places.googleapis.com/v1/places:searchText
 * Cabeçalhos X-Goog-Api-Key e X-Goog-FieldMask (obrigatório). locationBias.circle com centro e raio (máx. 50 000 m).
 * Condições: apenas o place_id pode ser guardado sem prazo; latitude/longitude podem ficar em cache até 30 dias.
 * O restante conteúdo é tratado como evidência com prazo (ver retenção nas Configurações e README).
 */
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const BASE_FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.location", "places.websiteUri",
  "places.nationalPhoneNumber", "places.internationalPhoneNumber", "places.businessStatus", "places.types",
  "places.googleMapsUri", "places.addressComponents", "nextPageToken",
];

interface PlacesResponse {
  places?: {
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    businessStatus?: string;
    types?: string[];
    googleMapsUri?: string;
    addressComponents?: { longText: string; types: string[] }[];
    reviews?: { publishTime?: string }[];
  }[];
  nextPageToken?: string;
}

export function mapPlace(p: NonNullable<PlacesResponse["places"]>[number], query: string): DiscoveryCandidate {
  const comp = (t: string) => p.addressComponents?.find((c) => c.types.includes(t))?.longText ?? null;
  const status = p.businessStatus === "OPERATIONAL" ? "operational"
    : p.businessStatus === "CLOSED_TEMPORARILY" ? "closed_temporarily"
      : p.businessStatus === "CLOSED_PERMANENTLY" ? "closed_permanently" : "unknown";
  const latestReviewAt = (p.reviews ?? []).map((r) => r.publishTime).filter(Boolean).sort().pop() ?? null;
  return {
    source: "google_places",
    externalId: p.id,
    name: p.displayName?.text ?? "(sem nome)",
    address: p.formattedAddress ?? null,
    locality: comp("locality") ?? comp("postal_town") ?? comp("administrative_area_level_2"),
    postcode: comp("postal_code") ?? extractPostcodePT(p.formattedAddress),
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    types: p.types ?? [],
    businessStatus: status,
    mapsUrl: p.googleMapsUri ?? null,
    latestReviewAt,
    query,
  };
}

export function googlePlacesProvider(opts: { apiKey?: string; includeReviews?: boolean; fetchImpl?: typeof fetch } = {}): DiscoveryProvider {
  const apiKey = opts.apiKey ?? process.env.GOOGLE_PLACES_API_KEY;
  const f = opts.fetchImpl ?? fetch;
  return {
    id: "google_places",
    label: "Google Places API (New)",
    attribution: "Dados de locais: Google Maps",
    configured: () => !!apiKey,
    async search(q: DiscoveryQuery, guard: UsageGuard) {
      if (!apiKey) throw new ProviderNotConfiguredError("google_places");
      const fields = [...BASE_FIELDS, ...(opts.includeReviews ? ["places.reviews"] : [])].join(",");
      const out: DiscoveryCandidate[] = [];
      let pageToken: string | undefined;
      // Cada página devolve até 20 locais; a API limita o total de páginas.
      for (let page = 0; page < 3 && out.length < q.maxResults; page++) {
        await guard.consume("google_places");
        const res = await f(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fields },
          body: JSON.stringify({
            textQuery: q.query,
            languageCode: "pt-PT",
            regionCode: "PT",
            pageSize: Math.min(20, q.maxResults - out.length),
            locationBias: { circle: { center: { latitude: q.center.lat, longitude: q.center.lng }, radius: Math.min(q.radiusKm * 1000, 50_000) } },
            ...(pageToken ? { pageToken } : {}),
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Google Places HTTP ${res.status}: ${body.slice(0, 300)}`);
        }
        const data = (await res.json()) as PlacesResponse;
        for (const p of data.places ?? []) out.push(mapPlace(p, q.query));
        pageToken = data.nextPageToken;
        if (!pageToken) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      return out.slice(0, q.maxResults);
    },
  };
}

/** Resolve uma localidade em coordenadas (para pesquisas fora das predefinições). */
export async function geocodeWithPlaces(text: string, guard: UsageGuard, apiKey = process.env.GOOGLE_PLACES_API_KEY) {
  if (!apiKey) throw new ProviderNotConfiguredError("google_places");
  await guard.consume("google_places");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.formattedAddress,places.location" },
    body: JSON.stringify({ textQuery: text, languageCode: "pt-PT", regionCode: "PT", pageSize: 1 }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const data = (await res.json()) as PlacesResponse;
  const p = data.places?.[0];
  if (!p?.location) return null;
  return { lat: p.location.latitude, lng: p.location.longitude, formattedAddress: p.formattedAddress ?? text };
}
