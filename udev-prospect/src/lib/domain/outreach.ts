/* Rascunhos de abordagem em português de Portugal. Todos os envios são manuais. */

export type DraftChannel = "curta" | "email" | "followup_1" | "followup_2";

export interface OutreachOpportunity {
  type: string;
  observed: string;
  evidenceIds: string[];
  sourceUrl: string | null;
  verifiedAt: string; // ISO
  ctaText?: string | null;
}

export interface OutreachContext {
  companyName: string;
  isAgency: boolean;
  pipelineStage: string;
  opportunity: OutreachOpportunity | null;
  followups: number; // 0..2, configurável
  senderName: string;
  /** Interações registadas pelo utilizador (para não inventar contactos prévios). */
  loggedContacts: number;
}

export interface Draft { channel: DraftChannel; subject: string | null; body: string; evidenceIds: string[] }

export class DoNotContactError extends Error {
  constructor() { super("Empresa marcada como «não contactar»: não são geradas sugestões de abordagem."); }
}
export class NoSourcedObservationError extends Error {
  constructor() { super("Sem observação sustentada por fonte: registe uma evidência ou nota antes de gerar a abordagem."); }
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "long" }).format(new Date(iso));
}

/** Frase curta, factual e verificável sobre a observação. */
export function observationPhrase(o: OutreachOpportunity): string {
  const when = `(verifiquei a ${fmtDate(o.verifiedAt)})`;
  switch (o.type) {
    case "booking_link_error": return `a ligação para marcações no site abre uma página de erro ${when}`;
    case "homepage_error": return `a página inicial do site está a devolver um erro ${when}`;
    case "dns_not_found": return `o endereço do site indicado nas listagens não está a abrir ${when}`;
    case "service_page_error": return `uma das páginas de serviços do menu abre uma página de erro ${when}`;
    case "contact_page_error": return `a página de contactos do menu abre uma página de erro ${when}`;
    case "placeholder_text": return `aparece texto provisório na página inicial do site ${when}`;
    case "cta_wrong_destination": return `o botão${o.ctaText ? ` “${o.ctaText}”` : ""} na página inicial não leva a nenhuma página ${when}`;
    case "no_contact_path": return `não encontrei telefone, email ou página de contactos na página inicial ${when}`;
    case "mobile_menu_inaccessible": return `no telemóvel o menu do site não mostra as ligações ${when}`;
    case "contact_overlapped": return `no telemóvel o botão de contacto fica tapado por outro elemento ${when}`;
    case "mobile_overflow": return `no telemóvel a página fica mais larga do que o ecrã ${when}`;
    case "no_viewport": return `o site não parece estar adaptado ao ecrã do telemóvel ${when}`;
    case "no_https": return `o site ainda abre sem ligação segura (HTTPS) ${when}`;
    case "tls_error": return `o navegador mostra um aviso de certificado ao abrir o site ${when}`;
    case "manual_note": return o.observed;
    default: return o.observed;
  }
}

export function buildDrafts(ctx: OutreachContext): Draft[] {
  if (ctx.pipelineStage === "nao_contactar") throw new DoNotContactError();
  const o = ctx.opportunity;
  if (!o || !o.evidenceIds.length) throw new NoSourcedObservationError();
  const ev = o.evidenceIds;
  const n = ctx.companyName;
  const me = ctx.senderName || "Ulisses";
  const drafts: Draft[] = [];

  if (ctx.isAgency) {
    drafts.push({ channel: "curta", subject: null, evidenceIds: ev, body:
      `Olá! Sou o ${me}, desenvolvedor web (WordPress, React e lojas online). Vi o vosso trabalho em marketing e redes sociais (${n}) e queria perguntar se faria sentido uma parceria: eu desenvolvo os sites dos vossos clientes e a vossa equipa mantém a relação comercial e os conteúdos. Podemos falar 15 minutos esta semana?` });
    drafts.push({ channel: "email", subject: `Parceria em desenvolvimento de sites — ${n}`, evidenceIds: ev, body:
      `Olá,\n\nSou o ${me}, desenvolvedor e web designer em Portugal. Trabalho com WordPress/Elementor, React e Node.js, em sites institucionais, landing pages e lojas online.\n\nAo ver a vossa apresentação online (${n}), ${observationPhrase(o)}. Por isso pensei que uma parceria poderia ser útil: eu trato do desenvolvimento, manutenção e integrações, e a vossa equipa mantém a relação com o cliente e os serviços de conteúdos e marketing.\n\nSe fizer sentido, posso explicar como costumo organizar este tipo de colaboração numa conversa curta.\n\nCumprimentos,\n${me}` });
  } else if (o.type === "website_not_located") {
    drafts.push({ channel: "curta", subject: null, evidenceIds: ev, body:
      `Olá, bom dia! Sou o ${me}, desenvolvedor web. Procurei «${n}» online e não encontrei um site oficial — pode existir e ter-me escapado. Têm atualmente algum site ou página onde os clientes vos encontram? Se for útil, posso partilhar algumas ideias, sem compromisso.` });
    drafts.push({ channel: "email", subject: `Presença online — ${n}`, evidenceIds: ev, body:
      `Olá,\n\nSou o ${me}, desenvolvedor e web designer em Portugal.\n\nAo pesquisar «${n}» pelo nome e localidade, não encontrei um site oficial nas fontes que consultei. Pode ser que exista e não o tenha encontrado, por isso pergunto: têm atualmente algum site ou página onde os clientes possam ver os serviços e contactar-vos?\n\nSe for um tema que vos interesse, terei gosto em conversar uns minutos e mostrar o que costumo fazer neste tipo de casos.\n\nCumprimentos,\n${me}` });
  } else {
    const obs = observationPhrase(o);
    drafts.push({ channel: "curta", subject: null, evidenceIds: ev, body:
      `Olá, bom dia! Sou o ${me}, desenvolvedor web. Ao visitar o vosso site (${n}) reparei que ${obs}. Se quiser, explico-lhe em poucos minutos o que estará a acontecer e como se pode corrigir. Faz sentido falarmos?` });
    drafts.push({ channel: "email", subject: `Uma observação sobre o site — ${n}`, evidenceIds: ev, body:
      `Olá,\n\nSou o ${me}, desenvolvedor e web designer em Portugal (WordPress, React, manutenção e otimização para telemóvel).\n\nAo visitar o vosso site (${n}), ${obs}. Pode já estar identificado do vosso lado; se não estiver, achei que seria útil saberem.\n\nSe fizer sentido, posso mostrar-lhe numa conversa curta o que observei e uma forma simples de o resolver.\n\nCumprimentos,\n${me}` });
  }
  const fu = Math.max(0, Math.min(2, ctx.followups));
  if (fu >= 1) drafts.push({ channel: "followup_1", subject: `Re: ${drafts[1].subject}`, evidenceIds: ev, body:
    `Olá novamente,\n\nVolto só para saber se a mensagem anterior chegou. Sei que o dia a dia é exigente, por isso fica à vontade: se o tema não for prioritário, não há problema.\n\nCumprimentos,\n${me}` });
  if (fu >= 2) drafts.push({ channel: "followup_2", subject: `Re: ${drafts[1].subject}`, evidenceIds: ev, body:
    `Olá,\n\nÚltima mensagem sobre este assunto, para não incomodar. Se em algum momento quiserem rever ${ctx.isAgency ? "a ideia de parceria" : "o site"}, fico disponível para uma conversa.\n\nObrigado pela atenção,\n${me}` });
  return drafts;
}

const BANNED: [RegExp, string][] = [
  [/perder (os )?clientes|est(ão|ao) a perder|perdem clientes/i, "afirmação de perda de clientes sem dados"],
  [/urgente|última oportunidade|só (hoje|esta semana)|vagas limitadas|n(ã|a)o perca/i, "falsa urgência"],
  [/garant(o|imos|ido)|resultados garantidos/i, "promessa de resultados"],
  [/j(á|a) fal(á|a)mos|como combin(á|a)mos|na nossa (última )?conversa|conforme conversado/i, "contacto prévio não registado"],
  [/preparei (uma|um) (demo|demonstra|prot[oó]tipo|maquete)/i, "demonstração não registada"],
  [/conhe(ç|c)o o (respons(á|a)vel|dono|propriet)/i, "conhecimento pessoal não registado"],
  [/incr(í|i)vel|fant(á|a)stico|maravilhos|o melhor (de|da|do)/i, "elogio vazio"],
  [/\d+ ?%|taxa de convers/i, "métrica inventada"],
];

/** Valida um rascunho (de modelo ou de IA). Devolve a lista de problemas encontrados. */
export function validateDraftText(text: string, ctx: Pick<OutreachContext, "loggedContacts" | "companyName"> & { allowedNumbers?: string[]; allowedUrls?: string[] }): string[] {
  const problems: string[] = [];
  for (const [re, why] of BANNED) {
    if (why === "contacto prévio não registado" && ctx.loggedContacts > 0) continue;
    if (re.test(text)) problems.push(why);
  }
  const allowedNums = new Set(ctx.allowedNumbers ?? []);
  for (const m of text.matchAll(/\d[\d.,]*/g)) if (!allowedNums.has(m[0]) && !/^(15|5|10)$/.test(m[0])) problems.push(`número não sustentado: ${m[0]}`);
  for (const m of text.matchAll(/https?:\/\/\S+/g)) if (!(ctx.allowedUrls ?? []).includes(m[0])) problems.push(`URL não sustentado: ${m[0]}`);
  if (!text.includes(ctx.companyName)) problems.push("não menciona a empresa");
  return problems;
}

/** Ligação para abrir o canal (o utilizador envia manualmente). */
export function channelLink(kind: "whatsapp" | "email" | "instagram" | "facebook", contactValue: string, draft: Draft): string | null {
  if (kind === "whatsapp") {
    try {
      const u = new URL(contactValue);
      if (!/wa\.me|whatsapp\.com/.test(u.hostname)) return null;
      u.searchParams.set("text", draft.body);
      return u.toString();
    } catch { return null; }
  }
  if (kind === "email") return `mailto:${encodeURIComponent(contactValue)}?subject=${encodeURIComponent(draft.subject ?? "")}&body=${encodeURIComponent(draft.body)}`;
  return /^https:\/\/(www\.)?(instagram|facebook)\.com\//.test(contactValue) ? contactValue : null;
}
