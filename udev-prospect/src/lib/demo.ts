import { withUser } from "./db";
import { LOCATION_PRESETS } from "./domain/geo";
import type { ContactDraft, EvidenceDraft, OpportunityDraft } from "./analysis/types";
import { insertEvidences, logActivity, syncOpportunities, upsertCompany, upsertContacts, type CompanyRow } from "./pipeline/repo";
import { scoreCompany } from "./pipeline/score";
import { DEMO_USER_ID } from "./session";
import { getSettings } from "./settings";

/*
 * Dados de DEMONSTRAÇÃO, totalmente fictícios. Ficam no utilizador DEMO_USER_ID, que é isolado dos dados reais
 * pelas políticas RLS: nunca aparecem nos leads, indicadores ou pesquisas da sua conta.
 * Domínios ".invalid" (reservados, RFC 2606) e telefones 000 garantem que nada aponta para empresas reais.
 */

interface DemoLead {
  name: string;
  niche: string;
  address: string;
  website: string | null;
  websiteStatus: CompanyRow["website_status"];
  phone: string;
  email: string | null;
  opportunity: Omit<OpportunityDraft, "evidenceKeys"> & { evidenceValue: string; evidenceUrl: string | null; method: string };
}

const LEADS: DemoLead[] = [
  { name: "Clínica Dentária Exemplo (demonstração)", niche: "clinica_dentaria", address: "Rua Fictícia 1, 5000-000 Vila Real", website: "https://clinica.exemplo.invalid/", websiteStatus: "confirmed",
    phone: "+351259000000", email: "geral@clinica.exemplo.invalid",
    opportunity: { type: "booking_link_error", tier: "principal", verification: "reproduced", observed: "A ligação \"Marcar consulta\" (https://clinica.exemplo.invalid/marcar) devolve HTTP 404 (exemplo fictício).",
      possibleImpact: "Quem tenta marcar pelo site pode não conseguir.", suggestedImprovement: "Corrigir o destino da marcação.", evidenceValue: "HTTP 404", evidenceUrl: "https://clinica.exemplo.invalid/marcar", method: "DEMONSTRAÇÃO — evidência fictícia" } },
  { name: "Barbearia Exemplo (demonstração)", niche: "barbearia", address: "Av. Fictícia 2, 5000-000 Vila Real", website: "https://barbearia.exemplo.invalid/", websiteStatus: "confirmed",
    phone: "+351939000000", email: null,
    opportunity: { type: "mobile_menu_inaccessible", tier: "obstacle", verification: "visual_structural", observed: "Em telemóvel as ligações do menu ficam ocultas e não há botão de menu visível (exemplo fictício).",
      possibleImpact: "Visitantes em telemóvel podem não chegar aos contactos.", suggestedImprovement: "Corrigir o menu responsivo.", evidenceValue: "menu oculto", evidenceUrl: "https://barbearia.exemplo.invalid/", method: "DEMONSTRAÇÃO — evidência fictícia" } },
  { name: "Restaurante Exemplo (demonstração)", niche: "restaurante", address: "Largo Fictício 3, 5000-000 Vila Real", website: null, websiteStatus: "not_located",
    phone: "+351259000001", email: null,
    opportunity: { type: "website_not_located", tier: "not_located", verification: "documented_search", observed: "Nenhum site próprio localizado nas fontes consultadas (exemplo fictício). Hipótese a confirmar.",
      possibleImpact: "A confirmar em conversa.", suggestedImprovement: "Perguntar pela presença digital atual.", evidenceValue: "0 resultados correspondentes", evidenceUrl: null, method: "DEMONSTRAÇÃO — pesquisa fictícia" } },
];

export async function ensureDemoData(): Promise<void> {
  await withUser(DEMO_USER_ID, async (db) => {
    if ((await db.query("select 1 from companies limit 1")).rowCount) return;
    const settings = await getSettings(db);
    const vr = LOCATION_PRESETS[0];
    const params = { locationKey: vr.key, locality: vr.locality, center: vr.center, centerLabel: `${vr.label} — DEMONSTRAÇÃO`, postcodePrefixes: vr.postcodePrefixes,
      excludeTerms: vr.excludeTerms, radiusKm: 15, niches: ["clinica_dentaria", "barbearia", "restaurante"], opportunityTypes: ["site_errors", "contact_path", "not_located"],
      mode: "clients", maxCandidates: 5, providers: ["google_places"] };
    const search = (await db.query(
      `insert into searches (params, status, stage, outcome, sources_consulted, started_at, finished_at)
       values ($1, 'completed', 'done', 'ok', $2, now(), now()) returning id`,
      [JSON.stringify(params), JSON.stringify([{ provider: "demonstração", status: "ok", query: "dados fictícios", at: new Date().toISOString(), results: LEADS.length }])])).rows[0].id;
    const now = new Date().toISOString();
    for (const [i, l] of LEADS.entries()) {
      const { company } = await upsertCompany(db, { name: l.name, address: l.address, locality: "Vila Real", postcode: "5000-000", lat: vr.center.lat + i * 0.002, lng: vr.center.lng,
        phone: l.phone, website: l.website, niche: l.niche, nicheStatus: "confirmed", businessStatus: "operational", distanceKm: 0.2 * i, searchId: search }, "demonstração");
      const evs: EvidenceDraft[] = [
        { key: "issue", field: `issue:${l.opportunity.type}`, value: l.opportunity.evidenceValue, sourceType: "manual", sourceUrl: l.opportunity.evidenceUrl, method: l.opportunity.method, status: "confirmed", observedAt: now },
        { key: "phone", field: "phone", value: l.phone, sourceType: l.website ? "website" : "manual", sourceUrl: l.website, method: "DEMONSTRAÇÃO — contacto fictício", status: "confirmed", observedAt: now },
        { key: "act", field: "activity", value: new Date(Date.now() - 20 * 86_400_000).toISOString(), sourceType: "manual", sourceUrl: null, method: "DEMONSTRAÇÃO — data fictícia", status: "confirmed", observedAt: now, details: { kind: "dated", label: "publicação fictícia" } },
      ];
      if (l.website) evs.push({ key: "site", field: "website", value: l.website, sourceType: "website", sourceUrl: l.website, method: "DEMONSTRAÇÃO — site fictício", status: "confirmed", observedAt: now });
      const contacts: ContactDraft[] = [{ kind: "phone", value: l.phone, valueNorm: l.phone, status: "confirmed", evidenceKey: "phone" }];
      if (l.email) { evs.push({ key: "email", field: "email", value: l.email, sourceType: "website", sourceUrl: l.website, method: "DEMONSTRAÇÃO — email fictício", status: "confirmed", observedAt: now }); contacts.push({ kind: "email", value: l.email, valueNorm: l.email, status: "confirmed", evidenceKey: "email" }); }
      const map = await insertEvidences(db, company.id, evs, search);
      await upsertContacts(db, company.id, contacts, map);
      await syncOpportunities(db, company.id, [{ ...l.opportunity, evidenceKeys: ["issue"] }], map, null, []);
      const upd = (await db.query<CompanyRow>(
        "update companies set identity_status = 'confirmed', location_status = 'confirmed', website_status = $2 where id = $1 returning *", [company.id, l.websiteStatus])).rows[0];
      await db.query("insert into search_candidates (search_id, source, external_id, name, status, outcome, company_id) values ($1, 'demonstração', $2, $3, 'done', 'dados fictícios', $4)",
        [search, `demo-${i}`, l.name, company.id]);
      await scoreCompany(db, upd, settings.rubric, settings.rubricVersion, { targetNiches: params.niches, mode: "clients" });
      await logActivity(db, company.id, "system", "Registo de DEMONSTRAÇÃO com dados fictícios.");
    }
  });
}
