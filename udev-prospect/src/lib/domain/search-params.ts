import { z } from "zod";
import { NICHES } from "./niches";

export const OPPORTUNITY_CATEGORIES = {
  site_errors: { label: "Falhas verificadas no site", types: ["dns_not_found", "homepage_error", "tls_error", "service_page_error", "contact_page_error", "placeholder_text", "booking_link_error"] },
  contact_path: { label: "Dificuldade no contacto/marcação", types: ["cta_wrong_destination", "no_contact_path", "contact_overlapped", "mobile_menu_inaccessible"] },
  not_located: { label: "Site não localizado", types: ["website_not_located"] },
  minor: { label: "Melhorias menores (telemóvel/HTTPS)", types: ["no_viewport", "mobile_overflow", "no_https"] },
} as const;
export type OpportunityCategory = keyof typeof OPPORTUNITY_CATEGORIES;

export function categoryOf(type: string): OpportunityCategory | null {
  for (const [k, v] of Object.entries(OPPORTUNITY_CATEGORIES)) if ((v.types as readonly string[]).includes(type)) return k as OpportunityCategory;
  return null;
}

const nicheKeys = NICHES.map((n) => n.key) as [string, ...string[]];

export const SearchParamsSchema = z.object({
  locationKey: z.string().max(40).nullable(),
  locality: z.string().trim().min(2).max(80),
  center: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  centerLabel: z.string().max(200),
  postcodePrefixes: z.array(z.string().regex(/^\d{1,4}$/)).max(5),
  excludeTerms: z.array(z.string().max(80)).max(10),
  radiusKm: z.number().min(1).max(50),
  niches: z.array(z.enum(nicheKeys)).min(1),
  opportunityTypes: z.array(z.enum(Object.keys(OPPORTUNITY_CATEGORIES) as [OpportunityCategory, ...OpportunityCategory[]])).min(1),
  mode: z.enum(["clients", "agencies"]),
  maxCandidates: z.number().int().min(1).max(200),
  providers: z.array(z.enum(["google_places", "osm"])).min(1),
});
export type SearchParams = z.infer<typeof SearchParamsSchema>;
