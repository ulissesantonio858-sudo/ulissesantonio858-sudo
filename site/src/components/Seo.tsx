import { useEffect } from 'react'
import { business } from '../content/business'
import { brandName, isPreview } from '../lib'

/** Título, descrição e dados estruturados — estes só com dados confirmados e visíveis na página. */
export function Seo() {
  useEffect(() => {
    const local = business.localidade ? ` em ${business.localidade}` : ''
    document.title = `${brandName} — ${business.segmento}${local}${isPreview ? ' (prévia)' : ''}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', business.site.descricao)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', isPreview ? 'noindex' : 'index,follow')

    const m = business.morada
    if (!business.nome || !m || !business.site.url) return
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      name: business.nome,
      url: business.site.url,
      telephone: business.marcacao.telefone ?? undefined,
      address: { '@type': 'PostalAddress', streetAddress: m.rua, postalCode: m.codigoPostal, addressLocality: m.cidade, addressCountry: m.pais },
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.textContent = JSON.stringify(ld)
    document.head.appendChild(el)
    return () => el.remove()
  }, [])
  return null
}
