import { ArrowRight } from 'lucide-react'
import { buyHref, hasCheckout } from '../../config/site'

/** CTA principal. Com checkout configurado abre o checkout; sem ele leva à secção da oferta. */
export function BuyButton({ className = '', label = 'Quero os Prompts Master' }: { className?: string; label?: string }) {
  return (
    <a
      href={buyHref}
      className={`btn-primary ${className}`}
      {...(hasCheckout ? { rel: 'noopener', 'data-checkout': '' } : {})}
    >
      {label}
      <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
    </a>
  )
}
