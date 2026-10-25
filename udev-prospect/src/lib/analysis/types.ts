import type { OpportunityTier, OpportunityVerification } from "../domain/scoring";

export type EvidenceStatus = "confirmed" | "inferred" | "not_found" | "unavailable" | "conflict";
export type SourceType = "google_places" | "osm" | "website" | "web_search" | "playwright" | "pagespeed" | "manual" | "csv_import" | "ai";

/** Evidência ainda por gravar; `key` liga-a a contactos e oportunidades antes de ter id. */
export interface EvidenceDraft {
  key: string;
  field: string;
  value: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  method: string;
  status: EvidenceStatus;
  observedAt: string;
  expiresAt?: string | null;
  details?: Record<string, unknown>;
}

export interface ContactDraft {
  kind: "phone" | "email" | "whatsapp" | "instagram" | "facebook" | "linkedin" | "contact_form" | "booking" | "other";
  value: string;
  valueNorm: string;
  status: EvidenceStatus;
  evidenceKey: string;
  note?: string;
}

export interface OpportunityDraft {
  type: string;
  tier: OpportunityTier;
  verification: OpportunityVerification;
  observed: string;
  possibleImpact: string;
  suggestedImprovement: string;
  evidenceKeys: string[];
}
