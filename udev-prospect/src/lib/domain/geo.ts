export interface GeoPoint { lat: number; lng: number }

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface LocationPreset {
  key: string;
  label: string;
  locality: string;
  center: GeoPoint;
  /** Prefixos de código postal esperados (ajuda a separar homónimos, ex. Vila Real ≠ Vila Real de Santo António). */
  postcodePrefixes: string[];
  excludeTerms: string[];
}

// Coordenadas aproximadas do centro da cidade de Vila Real (distrito de Vila Real), conferíveis em qualquer mapa.
export const LOCATION_PRESETS: LocationPreset[] = [
  {
    key: "vila-real",
    label: "Vila Real (distrito de Vila Real, Norte)",
    locality: "Vila Real",
    center: { lat: 41.2959, lng: -7.7464 },
    postcodePrefixes: ["50"],
    excludeTerms: ["vila real de santo antonio", "vila real de santo antónio", "vrsa"],
  },
];

export function presetByKey(key: string | null | undefined): LocationPreset | undefined {
  return LOCATION_PRESETS.find((p) => p.key === key);
}
