/**
 * Configuração central da landing page.
 * Preenche apenas com dados confirmados. Campos vazios ficam fora do que o visitante vê
 * e aparecem como pendências no aviso de revisão (modo de desenvolvimento ou ?revisao).
 */

export interface Price {
  /** Valor numérico, ex.: 29 */
  amount: number
  /** Código ISO 4217, ex.: 'EUR' */
  currency: string
  /** Nota curta confirmada, ex.: 'Pagamento único' */
  note?: string
}

export const site = {
  brand: 'Prompts Master',
  author: 'Ulisses Dev',

  /** [NOME FINAL DO PACK] */
  packName: 'Prompts Master — Engenharia Reversa',

  /** [PREÇO] — null até haver preço confirmado. */
  price: null as Price | null,

  /** [CHECKOUT_URL] — link do checkout existente. Vazio = botões de compra apontam para a secção da oferta. */
  checkoutUrl: '',

  /** [EMAIL OU WHATSAPP] */
  contact: {
    email: '',
    /** Só dígitos, com indicativo. Ex.: '351912345678' */
    whatsapp: '',
  },

  /** Perfis reais já publicados no README do GitHub. */
  social: {
    linkedin: 'https://www.linkedin.com/in/ulisses-ant%C3%B4nio-62a4a2317/',
    github: 'https://github.com/ulissesantonio858-sudo',
  },

  /** [ENTREGÁVEIS CONFIRMADOS] — ex.: '24 prompts organizados em 4 etapas'. Vazio = não mostrar quantidade. */
  deliverablesSummary: '',

  /** [CONDIÇÕES CONFIRMADAS] — acesso, utilização e suporte. Uma condição por linha. */
  conditions: [] as string[],

  /** Páginas legais reais (termos, privacidade). Só aparecem no rodapé se tiverem URL. */
  legal: [] as { label: string; href: string }[],
}

export const hasCheckout = site.checkoutUrl.trim().length > 0

/** Destino de todos os CTAs de compra. */
export const buyHref = hasCheckout ? site.checkoutUrl : '#oferta'

/** Percurso de contacto para serviços, separado do checkout. */
export function serviceContactHref(): { href: string; label: string; external: boolean } {
  const message = 'Olá Ulisses, gostava de falar sobre o meu projeto de site.'
  if (site.contact.whatsapp) {
    return {
      href: `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message)}`,
      label: 'WhatsApp',
      external: true,
    }
  }
  if (site.contact.email) {
    return {
      href: `mailto:${site.contact.email}?subject=${encodeURIComponent('Projeto de site')}&body=${encodeURIComponent(message)}`,
      label: 'Email',
      external: false,
    }
  }
  return { href: site.social.linkedin, label: 'LinkedIn', external: true }
}

export function formatPrice(price: Price): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: price.currency }).format(price.amount)
}

/** Lista de dados em falta, mostrada só no aviso de revisão. */
export function pendingItems(hasRealProjects: boolean, unconfirmedModules: number): string[] {
  const items: string[] = []
  if (!hasCheckout) items.push('CHECKOUT_URL — link do checkout')
  if (!site.price) items.push('PREÇO e moeda')
  if (!site.contact.email && !site.contact.whatsapp) items.push('EMAIL ou WHATSAPP profissional (contacto atual: LinkedIn)')
  if (!site.deliverablesSummary) items.push('Quantidade e formato dos prompts (ENTREGÁVEIS)')
  if (site.conditions.length === 0) items.push('CONDIÇÕES de acesso, utilização e suporte')
  if (!hasRealProjects) items.push('Projetos reais (capturas, links e contexto) — a galeria mostra demonstrações')
  if (unconfirmedModules > 0) items.push(`${unconfirmedModules} módulo(s) do pack por confirmar (ocultos ao visitante)`)
  if (site.legal.length === 0) items.push('Termos e política de privacidade (recomendado antes de vender)')
  return items
}
