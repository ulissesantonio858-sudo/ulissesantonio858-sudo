import { nicheByKey } from "../domain/niches";
import type { DiscoveryCandidate, DiscoveryProvider, DiscoveryQuery, UsageGuard } from "./types";

/*
 * OpenStreetMap via Overpass API (sem chave). Dados © contribuidores OpenStreetMap, licença ODbL
 * (armazenamento permitido com atribuição). A cobertura local pode ser incompleta.
 * Política de utilização: pedidos moderados e User-Agent identificável.
 */
const DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter";

interface OverpassElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export function buildOverpassQuery(q: DiscoveryQuery): string | null {
  const niche = nicheByKey(q.nicheKey);
  if (!niche || !niche.osmTags.length) return null;
  const r = Math.round(Math.min(q.radiusKm, 50) * 1000);
  const parts = niche.osmTags.map(([k, v]) => `nwr["${k}"="${v}"]["name"](around:${r},${q.center.lat},${q.center.lng});`);
  return `[out:json][timeout:25];(${parts.join("")});out center tags ${Math.min(q.maxResults, 200)};`;
}

export function mapOsm(el: OverpassElement, query: string): DiscoveryCandidate | null {
  const t = el.tags ?? {};
  if (!t.name) return null;
  const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
  const lat = el.lat ?? el.center?.lat ?? null;
  const lng = el.lon ?? el.center?.lon ?? null;
  const disused = Object.keys(t).some((k) => k.startsWith("disused:") || k.startsWith("was:")) || t["opening_hours"] === "closed";
  return {
    source: "osm",
    externalId: `${el.type}/${el.id}`,
    name: t.name,
    address: [street, t["addr:postcode"], t["addr:city"]].filter(Boolean).join(", ") || null,
    locality: t["addr:city"] ?? null,
    postcode: t["addr:postcode"] ?? null,
    lat, lng,
    phone: t.phone ?? t["contact:phone"] ?? t["contact:mobile"] ?? null,
    website: t.website ?? t["contact:website"] ?? t.url ?? null,
    types: [],
    osmTags: t,
    businessStatus: disused ? "closed_permanently" : "unknown",
    mapsUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    query,
  };
}

export function osmProvider(opts: { endpoint?: string; fetchImpl?: typeof fetch; enabled?: boolean } = {}): DiscoveryProvider {
  const endpoint = opts.endpoint ?? process.env.OVERPASS_URL ?? DEFAULT_ENDPOINT;
  const enabled = opts.enabled ?? process.env.OSM_ENABLED !== "false";
  const f = opts.fetchImpl ?? fetch;
  return {
    id: "osm",
    label: "OpenStreetMap (Overpass)",
    attribution: "© contribuidores OpenStreetMap (ODbL)",
    configured: () => enabled,
    async search(q: DiscoveryQuery, guard: UsageGuard) {
      const ql = buildOverpassQuery(q);
      if (!ql) return [];
      await guard.consume("osm");
      const res = await f(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "UDEV-Prospect/0.1 (uso individual)" },
        body: "data=" + encodeURIComponent(ql),
        signal: AbortSignal.timeout(40_000),
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const data = (await res.json()) as { elements?: OverpassElement[] };
      return (data.elements ?? []).map((e) => mapOsm(e, q.query)).filter((x): x is DiscoveryCandidate => !!x).slice(0, q.maxResults);
    },
  };
}
