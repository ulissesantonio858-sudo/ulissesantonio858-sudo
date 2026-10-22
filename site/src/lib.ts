import { business } from './content/business'
import { pendingItems } from './content/pending'
import type { Service } from './content/types'

export const brandName = business.nome ?? business.nomeProvisorio
export const pending = pendingItems(business)
export const isPreview = pending.length > 0

export const fmtDuracao = (min: number | null) =>
  min === null ? null : min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`

export const fmtPreco = (s: Service) =>
  s.preco === null
    ? null
    : `${s.precoDesde ? 'desde ' : ''}${s.preco.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: s.preco % 1 ? 2 : 0 })}`

/** Mensagem pré-preenchida: só o que ajuda a equipa a responder. */
export function bookingMessage(service: Service | undefined, periodo: string) {
  const partes = ['Olá! Gostaria de marcar']
  partes.push(service ? `: ${service.nome}.` : ' uma visita.')
  if (periodo) partes.push(` Prefiro ${periodo}.`)
  return partes.join('')
}

export function bookingLinks(service: Service | undefined, periodo: string) {
  const { whatsapp, telefone, sistemaUrl } = business.marcacao
  const msg = encodeURIComponent(bookingMessage(service, periodo))
  return {
    whatsapp: whatsapp ? `https://wa.me/${whatsapp}?text=${msg}` : null,
    telefone: telefone ? `tel:${telefone.replace(/\s/g, '')}` : null,
    sistema: sistemaUrl,
  }
}

export const SERVICE_EVENT = 'escolher-servico'
export function chooseService(id: string) {
  window.dispatchEvent(new CustomEvent(SERVICE_EVENT, { detail: id }))
  document.getElementById('marcar')?.scrollIntoView()
  // Foco no seletor para quem navega por teclado/leitor de ecrã.
  requestAnimationFrame(() => document.getElementById('servico-escolhido')?.focus({ preventScroll: true }))
}
