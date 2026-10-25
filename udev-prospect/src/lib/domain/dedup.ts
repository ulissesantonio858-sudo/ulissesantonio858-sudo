import { haversineKm } from "./geo";
import { nameSimilarity } from "./normalize";

export interface CompanyIdentity {
  id?: string;
  googlePlaceId?: string | null;
  osmId?: string | null;
  domain?: string | null;
  phone?: string | null;      // E.164
  nameNorm: string;
  localityNorm?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  groupKey?: string | null;
}

export type DedupDecision =
  | { kind: "match"; companyId: string; reason: string }
  | { kind: "branch"; relatedCompanyId: string; groupKey: string; reason: string }
  | { kind: "new"; reason: string };

const SAME_PLACE_KM = 0.15;
const DIFFERENT_PLACE_KM = 0.3;

function distance(a: CompanyIdentity, b: CompanyIdentity): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  return haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
}

/** Há indicação positiva de que são moradas diferentes? (dados em falta ⇒ não). */
function addressesDiffer(a: CompanyIdentity, b: CompanyIdentity): boolean {
  if (a.postcode && b.postcode && a.postcode !== b.postcode) return true;
  const d = distance(a, b);
  return d != null && d > DIFFERENT_PLACE_KM;
}

function sameLocality(a: CompanyIdentity, b: CompanyIdentity): boolean {
  if (a.localityNorm && b.localityNorm) return a.localityNorm === b.localityNorm;
  const d = distance(a, b);
  return d != null && d < 2;
}

/**
 * Decide se um candidato corresponde a uma empresa existente, a uma filial distinta da mesma marca,
 * ou a uma empresa nova (incluindo homónimos noutra localidade).
 * A ordem das regras vai do identificador mais forte para o mais fraco.
 */
export function decideDedup(candidate: CompanyIdentity, existing: CompanyIdentity[]): DedupDecision {
  for (const e of existing) {
    if (!e.id) continue;
    if (candidate.googlePlaceId && e.googlePlaceId === candidate.googlePlaceId)
      return { kind: "match", companyId: e.id, reason: "mesmo identificador Google Places" };
    if (candidate.osmId && e.osmId === candidate.osmId)
      return { kind: "match", companyId: e.id, reason: "mesmo identificador OpenStreetMap" };
  }
  // Dois identificadores externos diferentes do mesmo fornecedor indicam locais distintos.
  const distinctExternal = (e: CompanyIdentity) =>
    (candidate.googlePlaceId && e.googlePlaceId && candidate.googlePlaceId !== e.googlePlaceId) ||
    (candidate.osmId && e.osmId && candidate.osmId !== e.osmId);

  for (const e of existing) {
    if (!e.id || !candidate.phone || e.phone !== candidate.phone) continue;
    if (addressesDiffer(candidate, e))
      return { kind: "branch", relatedCompanyId: e.id, groupKey: e.groupKey ?? e.domain ?? e.nameNorm, reason: "mesmo telefone, morada diferente (possível filial)" };
    if (!distinctExternal(e)) return { kind: "match", companyId: e.id, reason: "mesmo telefone" };
  }
  for (const e of existing) {
    if (!e.id || !candidate.domain || e.domain !== candidate.domain) continue;
    if (addressesDiffer(candidate, e) || (candidate.phone && e.phone && candidate.phone !== e.phone))
      return { kind: "branch", relatedCompanyId: e.id, groupKey: e.groupKey ?? e.domain, reason: "mesmo domínio, morada/telefone diferentes (filial)" };
    if (!distinctExternal(e)) return { kind: "match", companyId: e.id, reason: "mesmo domínio" };
  }
  for (const e of existing) {
    if (!e.id) continue;
    const sim = candidate.nameNorm === e.nameNorm ? 1 : nameSimilarity(candidate.nameNorm, e.nameNorm);
    if (sim < 0.85) continue;
    if (!sameLocality(candidate, e)) continue; // homónimo noutra localidade ⇒ empresa diferente
    if (distinctExternal(e)) continue;
    const d = distance(candidate, e);
    if (addressesDiffer(candidate, e)) {
      // Mesmo nome na mesma localidade mas noutro sítio: só é filial se houver outro elo (domínio/grupo).
      continue;
    }
    if (candidate.phone && e.phone && candidate.phone !== e.phone && !(d != null && d < SAME_PLACE_KM))
      continue;
    return { kind: "match", companyId: e.id, reason: "mesmo nome normalizado e mesma localidade" };
  }
  return { kind: "new", reason: "sem identificadores coincidentes" };
}
