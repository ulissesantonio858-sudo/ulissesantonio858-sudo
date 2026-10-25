import type { Rubric } from "./rubric";

/* Tipos de factos que alimentam a pontuação. Todos vêm de evidências guardadas — nunca de suposições. */

export type VerificationStatus = "confirmed" | "inferred" | "unverified" | "conflict";
export type OpportunityTier = "principal" | "obstacle" | "not_located" | "minor";
export type OpportunityVerification = "reproduced" | "single_observation" | "visual_structural" | "documented_search";

export interface OpportunityFact {
  type: string;
  tier: OpportunityTier;
  verification: OpportunityVerification;
  evidenceIds: string[];
  observed: string;
}

export interface ActivityFact {
  kind: "dated" | "operational_status" | "copyright_year";
  date: string | null; // ISO
  source: string;
  evidenceId: string;
}

export interface ContactFact {
  kind: string; // phone | email | whatsapp | instagram | facebook | linkedin | contact_form | booking
  status: "confirmed" | "inferred" | "not_found" | "unavailable" | "conflict";
  onOfficialSite: boolean;
  crossConfirmed: boolean;
  evidenceId: string | null;
}

export interface ScoringFacts {
  mode: "clients" | "agencies";
  identity: VerificationStatus;
  location: "confirmed" | "inferred" | "unverified" | "outside_region" | "conflict";
  businessStatus: "operational" | "closed_temporarily" | "closed_permanently" | "unknown";
  niche: { key: string | null; status: "confirmed" | "inferred" | "unknown"; inTargetList: boolean };
  isAgency: boolean;
  agencyOffersWebdev: boolean | null; // null = não verificado
  websiteStatus: "confirmed" | "not_located" | "not_verified" | "unreachable" | "blocked" | "conflict";
  opportunities: OpportunityFact[];
  activity: ActivityFact[];
  contacts: ContactFact[];
  evidence: {
    independentSources: number;
    newestObservedAt: string | null;
    oldestKeyObservedAt: string | null;
    openConflicts: { field: string }[];
    inconclusiveChecks: number; // timeouts, bloqueios, CAPTCHA
  };
  now: Date;
}

export interface CriterionResult {
  key: "opportunity" | "fit" | "activity" | "contact";
  label: string;
  points: number;
  max: number;
  level: string;
  explanation: string;
  evidenceIds: string[];
}

export interface ScoreResult {
  total: number;
  criteria: CriterionResult[];
  confidence: "alto" | "medio" | "baixo";
  confidenceReasons: string[];
  priority: "alta" | "media" | "baixa";
  priorityGaps: string[];
  qualification: "qualified" | "review" | "discarded";
  qualificationReasons: string[];
}

// Divergências que impedem confiar na identidade ou localização. Telefones diferentes entre fontes são comuns (fixo vs. móvel) e não são críticos.
const CRITICAL_CONFLICT_FIELDS = new Set(["identity", "name", "location", "address", "website", "business_status"]);
const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Critério 1 — Oportunidade observada (máx. 40). Usa o nível mais forte; não soma descrições do mesmo problema.
// Casos de zero: nenhuma oportunidade aberta; site inacessível por timeout/bloqueio (não prova nada);
// site não localizado sem pesquisa web documentada.
// ---------------------------------------------------------------------------
export function scoreOpportunity(f: ScoringFacts, r: Rubric): CriterionResult {
  const base = { key: "opportunity" as const, label: "Oportunidade observada", max: 40 };
  if (f.mode === "agencies" || f.isAgency) {
    if (f.agencyOffersWebdev === false)
      return { ...base, points: r.opportunity.agency_no_webdev, level: "agência sem oferta web visível",
        explanation: "Na página de serviços verificada não aparece desenvolvimento de sites; a parceria pode complementar a oferta (hipótese a confirmar em conversa).", evidenceIds: [] };
    if (f.agencyOffersWebdev === true)
      return { ...base, points: r.opportunity.agency_offers_webdev, level: "agência já oferece sites",
        explanation: "A agência já anuncia criação de sites; parceria possível apenas como capacidade extra.", evidenceIds: [] };
    return { ...base, points: 0, level: "não verificado", explanation: "Serviços da agência não verificados.", evidenceIds: [] };
  }
  let best: { points: number; level: string; opp: OpportunityFact } | null = null;
  for (const o of f.opportunities) {
    let points = 0;
    let level = "";
    if (o.tier === "principal" && o.verification === "reproduced") { points = r.opportunity.principal_reproduced; level = "falha principal reproduzida"; }
    else if (o.tier === "principal") { points = r.opportunity.principal_single; level = "falha principal observada uma vez"; }
    else if (o.tier === "obstacle") { points = r.opportunity.obstacle; level = "obstáculo no contacto/navegação"; }
    else if (o.tier === "not_located" && o.verification === "documented_search") { points = r.opportunity.not_located; level = "site não localizado (hipótese)"; }
    else if (o.tier === "minor") { points = r.opportunity.minor; level = "problema estrutural menor"; }
    if (points > (best?.points ?? 0)) best = { points, level, opp: o };
  }
  if (!best) {
    const why = f.websiteStatus === "unreachable" || f.websiteStatus === "blocked"
      ? "O site não respondeu ou bloqueou a verificação; isso não prova que esteja offline. Sem pontos até nova verificação."
      : f.websiteStatus === "not_verified"
        ? "Presença digital não verificada (ex.: pesquisa web não configurada)."
        : "Nenhuma oportunidade documentada.";
    return { ...base, points: 0, level: "nenhuma", explanation: why, evidenceIds: [] };
  }
  const others = f.opportunities.length - 1;
  return {
    ...base,
    points: best.points,
    level: best.level,
    explanation: best.opp.observed + (others > 0 ? ` (+${others} outra(s) observação(ões), não somadas)` : ""),
    evidenceIds: best.opp.evidenceIds,
  };
}

// ---------------------------------------------------------------------------
// Critério 2 — Adequação aos serviços e ao mercado (máx. 20).
// Zero: fora da região; nicho fora da lista e sem indício de serviço local.
// ---------------------------------------------------------------------------
export function scoreFit(f: ScoringFacts, r: Rubric): CriterionResult {
  const base = { key: "fit" as const, label: "Adequação aos serviços e mercado", max: 20, evidenceIds: [] as string[] };
  if (f.location === "outside_region") return { ...base, points: 0, level: "fora da região", explanation: "Localização confirmada fora do raio escolhido." };
  const inRegion = f.location === "confirmed" || f.location === "inferred";
  if (!inRegion) {
    if (f.niche.inTargetList) return { ...base, points: r.fit.region_unverified, level: "região por confirmar", explanation: "Nicho alvo, mas a localização não está confirmada." };
    return { ...base, points: 0, level: "sem dados", explanation: "Nicho e localização por confirmar." };
  }
  if (f.niche.inTargetList && f.niche.status === "confirmed")
    return { ...base, points: r.fit.confirmed_in_region, level: "nicho confirmado na região", explanation: `Nicho ${f.niche.key} confirmado por listagem e localização dentro do raio.` };
  if (f.niche.inTargetList && f.niche.status === "inferred")
    return { ...base, points: r.fit.inferred_in_region, level: "nicho inferido na região", explanation: `Nicho ${f.niche.key} inferido (nome/IA), não confirmado por categoria oficial.` };
  return { ...base, points: r.fit.other_local_in_region, level: "outro serviço local", explanation: "Negócio local na região, fora dos nichos prioritários." };
}

// ---------------------------------------------------------------------------
// Critério 3 — Evidência recente de atividade (máx. 20), com fonte e data.
// Zero: sem sinais, ou sinais datados com mais de um ano; empresa encerrada.
// ---------------------------------------------------------------------------
export function scoreActivity(f: ScoringFacts, r: Rubric): CriterionResult {
  const base = { key: "activity" as const, label: "Evidência recente de atividade", max: 20 };
  if (f.businessStatus === "closed_permanently")
    return { ...base, points: 0, level: "encerrada", explanation: "Listagem indica encerramento permanente.", evidenceIds: [] };
  const dated = f.activity
    .filter((a) => a.kind === "dated" && a.date)
    .map((a) => ({ a, age: (f.now.getTime() - new Date(a.date!).getTime()) / DAY }))
    .filter((x) => x.age >= -1)
    .sort((x, y) => x.age - y.age);
  const newest = dated[0];
  if (newest && newest.age <= r.activity.recent_days)
    return { ...base, points: r.activity.recent, level: `≤ ${r.activity.recent_days} dias`, explanation: `${newest.a.source} em ${newest.a.date!.slice(0, 10)}.`, evidenceIds: [newest.a.evidenceId] };
  if (newest && newest.age <= r.activity.year_days)
    return { ...base, points: r.activity.year, level: `≤ ${r.activity.year_days} dias`, explanation: `${newest.a.source} em ${newest.a.date!.slice(0, 10)}.`, evidenceIds: [newest.a.evidenceId] };
  const weak = f.activity.find((a) => a.kind === "operational_status" || a.kind === "copyright_year");
  if (weak)
    return { ...base, points: r.activity.weak_signal, level: "sinal fraco sem data", explanation: `${weak.source} (sinal fraco: não demonstra atividade recente).`, evidenceIds: [weak.evidenceId] };
  return { ...base, points: 0, level: "sem evidência", explanation: newest ? `Último sinal datado com mais de ${r.activity.year_days} dias.` : "Sem sinais de atividade datados.", evidenceIds: [] };
}

// ---------------------------------------------------------------------------
// Critério 4 — Contacto profissional publicado e associado à empresa correta (máx. 20).
// Zero: nenhum contacto; identidade por confirmar (não é possível garantir que o contacto é desta empresa).
// Um email publicado conta como publicado — não como caixa confirmada.
// ---------------------------------------------------------------------------
export function scoreContact(f: ScoringFacts, r: Rubric): CriterionResult {
  const base = { key: "contact" as const, label: "Contacto profissional publicado", max: 20 };
  const direct = f.contacts.filter((c) => ["phone", "email", "whatsapp"].includes(c.kind) && (c.status === "confirmed" || c.status === "inferred"));
  const indirect = f.contacts.filter((c) => ["instagram", "facebook", "linkedin", "contact_form", "booking"].includes(c.kind) && c.status === "confirmed");
  if (f.identity === "unverified" || f.identity === "conflict")
    return { ...base, points: 0, level: "identidade por confirmar", explanation: "Sem identidade confirmada não é possível associar os contactos à empresa certa.", evidenceIds: [] };
  const official = direct.find((c) => c.status === "confirmed" && (c.onOfficialSite || c.crossConfirmed));
  if (official && f.identity === "confirmed")
    return { ...base, points: r.contact.official_confirmed, level: "publicado em fonte oficial",
      explanation: `${official.kind} publicado ${official.onOfficialSite ? "no site oficial" : "em duas fontes coincidentes"} (publicado ≠ confirmado como ativo).`, evidenceIds: official.evidenceId ? [official.evidenceId] : [] };
  const listing = direct.find((c) => c.status === "confirmed" || c.status === "inferred");
  if (listing && f.identity === "confirmed")
    return { ...base, points: r.contact.listing_only, level: "apenas numa listagem", explanation: `${listing.kind} visto numa única fonte, sem confirmação cruzada.`, evidenceIds: listing.evidenceId ? [listing.evidenceId] : [] };
  const any = indirect[0] ?? listing;
  if (any)
    return { ...base, points: r.contact.social_or_form_only, level: "contacto indireto", explanation: `Só existe ${any.kind}${f.identity === "inferred" ? " e a identidade é apenas inferida" : ""}.`, evidenceIds: any.evidenceId ? [any.evidenceId] : [] };
  return { ...base, points: 0, level: "sem contacto", explanation: "Nenhum contacto profissional publicado encontrado.", evidenceIds: [] };
}

// ---------------------------------------------------------------------------
// Confiança: cobertura, atualidade, qualidade das fontes e conflitos. Não é uma probabilidade.
// ---------------------------------------------------------------------------
export function computeConfidence(f: ScoringFacts): { level: "alto" | "medio" | "baixo"; reasons: string[] } {
  const reasons: string[] = [];
  let pts = 0;
  if (f.identity === "confirmed") { pts += 2; reasons.push("identidade confirmada em fontes independentes"); }
  else if (f.identity === "inferred") { pts += 1; reasons.push("identidade apenas inferida"); }
  else reasons.push("identidade por confirmar");
  if (f.location === "confirmed") { pts += 2; reasons.push("localização confirmada"); }
  else if (f.location === "inferred") { pts += 1; reasons.push("localização inferida"); }
  else reasons.push("localização por confirmar");
  if (f.evidence.independentSources >= 3) { pts += 2; reasons.push(`${f.evidence.independentSources} tipos de fonte independentes`); }
  else if (f.evidence.independentSources === 2) { pts += 1; reasons.push("2 tipos de fonte"); }
  else reasons.push("apenas 1 tipo de fonte");
  const oldest = f.evidence.oldestKeyObservedAt ? (f.now.getTime() - new Date(f.evidence.oldestKeyObservedAt).getTime()) / DAY : null;
  if (oldest != null && oldest <= 30) { pts += 1; reasons.push("evidências verificadas nos últimos 30 dias"); }
  else reasons.push("há evidências com mais de 30 dias — reverificar");
  if (f.opportunities.some((o) => o.verification === "reproduced" || o.verification === "documented_search")) { pts += 1; reasons.push("oportunidade reproduzida/documentada"); }
  if (f.evidence.inconclusiveChecks > 0) { pts -= 1; reasons.push(`${f.evidence.inconclusiveChecks} verificação(ões) inconclusiva(s) (timeout/bloqueio)`); }
  let level: "alto" | "medio" | "baixo" = pts >= 7 ? "alto" : pts >= 4 ? "medio" : "baixo";
  const critical = f.evidence.openConflicts.filter((c) => CRITICAL_CONFLICT_FIELDS.has(c.field));
  if (critical.length) { level = "baixo"; reasons.push(`conflito por resolver em: ${critical.map((c) => c.field).join(", ")}`); }
  else if (f.evidence.openConflicts.length && level === "alto") { level = "medio"; reasons.push("conflitos menores por resolver"); }
  return { level, reasons };
}

export function computeScore(f: ScoringFacts, r: Rubric): ScoreResult {
  const criteria = [scoreOpportunity(f, r), scoreFit(f, r), scoreActivity(f, r), scoreContact(f, r)];
  const total = Math.max(0, Math.min(100, criteria.reduce((s, c) => s + c.points, 0)));
  const { level: confidence, reasons: confidenceReasons } = computeConfidence(f);
  const [opp, , , contact] = criteria;

  let priority: ScoreResult["priority"] = total >= r.priority.high ? "alta" : total >= r.priority.medium ? "media" : "baixa";
  const priorityGaps: string[] = [];
  if (total >= r.priority.high) {
    if (f.identity !== "confirmed") priorityGaps.push("identidade não confirmada");
    if (f.location !== "confirmed") priorityGaps.push("localização não confirmada");
    if (confidence !== "alto") priorityGaps.push(`confiança ${confidence} (exige alta)`);
    if (contact.points < r.contact.listing_only) priorityGaps.push("sem contacto profissional publicado");
    if (opp.points === 0) priorityGaps.push("sem oportunidade documentada");
    if (priorityGaps.length) priority = "media";
  }

  const qualificationReasons: string[] = [];
  let qualification: ScoreResult["qualification"] = "qualified";
  if (f.businessStatus === "closed_permanently") { qualification = "discarded"; qualificationReasons.push("empresa encerrada segundo a listagem"); }
  if (f.location === "outside_region") { qualification = "discarded"; qualificationReasons.push("fora da região escolhida"); }
  if (qualification !== "discarded") {
    if (opp.points === 0) {
      if (f.websiteStatus === "unreachable" || f.websiteStatus === "blocked" || f.websiteStatus === "not_verified") {
        qualification = "review"; qualificationReasons.push("verificação do site/presença digital incompleta");
      } else { qualification = "discarded"; qualificationReasons.push("sem oportunidade relevante documentada"); }
    }
    if (f.identity === "unverified" || f.identity === "conflict") { qualification = "review"; qualificationReasons.push("identidade por confirmar"); }
    if (f.businessStatus === "closed_temporarily") { qualification = "review"; qualificationReasons.push("encerrada temporariamente"); }
    if (f.evidence.openConflicts.some((c) => CRITICAL_CONFLICT_FIELDS.has(c.field))) { qualification = "review"; qualificationReasons.push("divergência entre fontes por resolver"); }
  }
  return { total, criteria, confidence, confidenceReasons, priority, priorityGaps, qualification, qualificationReasons };
}

/** Resposta direta a "porque vale a pena contactar agora?", assumindo limitações quando faltam evidências. */
export function whyContactNow(f: ScoringFacts, s: ScoreResult): string {
  const opp = s.criteria[0];
  const parts: string[] = [];
  if (opp.points > 0) parts.push(`Observação: ${opp.explanation}`);
  else parts.push("Não há uma oportunidade concreta documentada; contactar agora seria uma abordagem genérica.");
  if (f.opportunities.some((o) => o.tier === "not_located"))
    parts.push("O site não foi localizado nas fontes consultadas — isto é uma hipótese; a abordagem deve perguntar pela presença digital, não afirmar que não existe.");
  const act = s.criteria[2];
  if (act.points >= 12) parts.push(`Atividade recente: ${act.explanation}`);
  else parts.push("Sem prova de atividade recente datada.");
  if (s.priorityGaps.length) parts.push(`Antes de tratar como prioridade alta falta: ${s.priorityGaps.join("; ")}.`);
  if (s.confidence !== "alto") parts.push(`Confiança ${s.confidence}: rever as evidências antes de contactar.`);
  parts.push("Interesse, orçamento e disponibilidade só podem ser confirmados em conversa.");
  return parts.join(" ");
}
