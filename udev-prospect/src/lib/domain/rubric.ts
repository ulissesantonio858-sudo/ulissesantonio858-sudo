import { z } from "zod";

/**
 * Rubrica de pontuação configurável e versionada.
 * Os valores são pontos atribuídos por nível; os critérios e casos de zero estão definidos em scoring.ts.
 */
export const RubricSchema = z.object({
  opportunity: z.object({
    principal_reproduced: z.number().int().min(0).max(40),   // falha principal reproduzida (≥2 tentativas)
    obstacle: z.number().int().min(0).max(40),               // obstáculo relevante no contacto/navegação
    not_located: z.number().int().min(0).max(40),            // site não localizado após pesquisa documentada
    principal_single: z.number().int().min(0).max(40),       // falha principal vista uma vez (por confirmar)
    minor: z.number().int().min(0).max(40),                  // problema estrutural menor verificado
    agency_no_webdev: z.number().int().min(0).max(40),       // agência sem oferta de desenvolvimento web visível
    agency_offers_webdev: z.number().int().min(0).max(40),   // agência que já oferece sites (parceria menos provável)
  }),
  fit: z.object({
    confirmed_in_region: z.number().int().min(0).max(20),
    inferred_in_region: z.number().int().min(0).max(20),
    other_local_in_region: z.number().int().min(0).max(20),
    region_unverified: z.number().int().min(0).max(20),
  }),
  activity: z.object({
    recent_days: z.number().int().min(1).max(365),
    recent: z.number().int().min(0).max(20),
    year_days: z.number().int().min(1).max(730),
    year: z.number().int().min(0).max(20),
    weak_signal: z.number().int().min(0).max(20),           // estado "operacional" sem data ou ano de copyright atual
  }),
  contact: z.object({
    official_confirmed: z.number().int().min(0).max(20),
    listing_only: z.number().int().min(0).max(20),
    social_or_form_only: z.number().int().min(0).max(20),
  }),
  priority: z.object({
    high: z.number().int().min(1).max(100),
    medium: z.number().int().min(1).max(100),
  }).refine((p) => p.medium < p.high, "O limiar médio tem de ser inferior ao alto"),
});
export type Rubric = z.infer<typeof RubricSchema>;

export const DEFAULT_RUBRIC: Rubric = {
  opportunity: {
    principal_reproduced: 40,
    obstacle: 35,
    not_located: 25,
    principal_single: 20,
    minor: 15,
    agency_no_webdev: 35,
    agency_offers_webdev: 10,
  },
  fit: { confirmed_in_region: 20, inferred_in_region: 14, other_local_in_region: 8, region_unverified: 6 },
  activity: { recent_days: 90, recent: 20, year_days: 365, year: 12, weak_signal: 6 },
  contact: { official_confirmed: 20, listing_only: 12, social_or_form_only: 6 },
  priority: { high: 75, medium: 50 },
};
export const DEFAULT_RUBRIC_VERSION = 1;
