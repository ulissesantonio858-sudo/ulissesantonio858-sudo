import { stripAccents } from "./normalize";

export interface Niche {
  key: string;
  label: string;
  /** Consultas de texto usadas na pesquisa (o sistema acrescenta "em <localidade>"). */
  queries: string[];
  /** Tipos do Google Places que confirmam o nicho. */
  placesTypes: string[];
  /** Etiquetas OpenStreetMap [chave, valor] que confirmam o nicho. */
  osmTags: [string, string][];
  /** Palavras no nome que permitem inferir o nicho (inferência, não confirmação). */
  keywords: string[];
  agency?: boolean;
}

export const NICHES: Niche[] = [
  { key: "clinica_dentaria", label: "Clínica dentária", queries: ["clínica dentária", "dentista"],
    placesTypes: ["dental_clinic", "dentist"], osmTags: [["amenity", "dentist"], ["healthcare", "dentist"]],
    keywords: ["dentaria", "dentario", "dental", "dentista", "medicina dentaria", "ortodontia", "implantologia"] },
  { key: "clinica_estetica", label: "Clínica de estética", queries: ["clínica de estética", "estética avançada"],
    placesTypes: ["skin_care_clinic", "spa", "beauty_salon"], osmTags: [["shop", "beauty"], ["leisure", "spa"]],
    keywords: ["estetica", "aesthetic", "laser", "depilacao", "spa", "dermo"] },
  { key: "salao_beleza", label: "Salão de beleza", queries: ["salão de beleza", "unhas manicure"],
    placesTypes: ["beauty_salon", "nail_salon"], osmTags: [["shop", "beauty"]],
    keywords: ["beleza", "beauty", "nails", "unhas", "manicure"] },
  { key: "cabeleireiro", label: "Cabeleireiro", queries: ["cabeleireiro"],
    placesTypes: ["hair_salon", "hair_care"], osmTags: [["shop", "hairdresser"]],
    keywords: ["cabeleireiro", "cabeleireira", "hair", "cabelos"] },
  { key: "barbearia", label: "Barbearia", queries: ["barbearia"],
    placesTypes: ["barber_shop"], osmTags: [["shop", "hairdresser"]],
    keywords: ["barbearia", "barber", "barbeiro"] },
  { key: "advogado", label: "Advogado", queries: ["advogado", "escritório de advogados"],
    placesTypes: ["lawyer"], osmTags: [["office", "lawyer"]],
    keywords: ["advogado", "advogada", "advogados", "advocacia", "sociedade de advogados", "solicitador"] },
  { key: "restaurante", label: "Restaurante", queries: ["restaurante"],
    placesTypes: ["restaurant"], osmTags: [["amenity", "restaurant"]],
    keywords: ["restaurante", "tasca", "churrasqueira", "marisqueira", "pizzaria", "taberna"] },
  { key: "ginasio", label: "Ginásio", queries: ["ginásio", "health club", "crossfit"],
    placesTypes: ["gym", "fitness_center"], osmTags: [["leisure", "fitness_centre"]],
    keywords: ["ginasio", "gym", "fitness", "crossfit", "health club", "pilates"] },
  { key: "servicos_locais", label: "Outros serviços locais", queries: ["fisioterapia", "clínica veterinária", "contabilidade"],
    placesTypes: ["physiotherapist", "veterinary_care", "accounting"], osmTags: [["healthcare", "physiotherapist"], ["amenity", "veterinary"], ["office", "accountant"]],
    keywords: ["fisioterapia", "veterinaria", "contabilidade", "explicacoes", "oficina", "imobiliaria"] },
  { key: "agencia_marketing", label: "Agência de marketing / redes sociais", queries: ["agência de marketing digital", "gestão de redes sociais"],
    placesTypes: ["marketing_agency", "advertising_agency"], osmTags: [["office", "advertising_agency"], ["office", "marketing"]],
    keywords: ["marketing", "agencia", "social media", "redes sociais", "comunicacao", "publicidade", "branding"], agency: true },
];

export function nicheByKey(key: string | null | undefined): Niche | undefined {
  return NICHES.find((n) => n.key === key);
}

export interface NicheMatch { key: string; status: "confirmed" | "inferred"; via: string }

/** Classificação determinística: tipos de listagem confirmam; palavras no nome apenas inferem. */
export function classifyNiche(input: { types?: string[]; osmTags?: Record<string, string>; name: string }, allowed: string[]): NicheMatch | null {
  const candidates = NICHES.filter((n) => allowed.includes(n.key));
  for (const n of candidates) {
    const t = input.types?.find((x) => n.placesTypes.includes(x));
    if (t) return { key: n.key, status: "confirmed", via: `tipo Google Places "${t}"` };
    const o = n.osmTags.find(([k, v]) => input.osmTags?.[k] === v);
    if (o) return { key: n.key, status: "confirmed", via: `etiqueta OSM ${o[0]}=${o[1]}` };
  }
  const nameN = " " + stripAccents(input.name.toLowerCase()) + " ";
  for (const n of candidates) {
    const k = n.keywords.find((kw) => nameN.includes(kw));
    if (k) return { key: n.key, status: "inferred", via: `palavra "${k}" no nome` };
  }
  return null;
}

/** Serviço sugerido conforme o tipo de oportunidade documentada (uma sugestão, não um diagnóstico de necessidade). */
export function suggestService(opportunityType: string | null, isAgency: boolean): string {
  if (isAgency) return "Parceria: desenvolvimento de sites em white-label para clientes da agência";
  switch (opportunityType) {
    case "booking_link_error":
    case "cta_wrong_destination":
      return "Correção do percurso de marcação/contacto e manutenção do site";
    case "homepage_error":
    case "dns_not_found":
    case "service_page_error":
      return "Recuperação ou reconstrução do site e plano de manutenção";
    case "placeholder_text":
      return "Revisão de conteúdos e finalização do site";
    case "mobile_menu_inaccessible":
    case "contact_overlapped":
    case "mobile_overflow":
    case "no_viewport":
      return "Otimização responsiva (telemóvel) do site existente";
    case "no_contact_path":
      return "Página de contactos e chamadas para ação claras";
    case "website_not_located":
      return "Site institucional ou landing page (confirmar primeiro se já existe presença digital)";
    case "no_https":
      return "Configuração de HTTPS e manutenção técnica";
    default:
      return "Avaliar em conversa (sem oportunidade específica documentada)";
  }
}
