import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { media } from '../media'

type Variant = 'dark' | 'glass' | 'outline'

const ARROW: Record<Variant, { src: string; w: number; h: number }> = {
  dark: { src: media('seta-contacto.svg'), w: 63, h: 60 },
  glass: { src: media('seta-orcamento.svg'), w: 63, h: 60 },
  outline: { src: media('seta-servico.svg'), w: 40, h: 72 },
}

type Common = { variant: Variant; children: ReactNode; className?: string }

function Inner({ variant, children }: Common) {
  const a = ARROW[variant]
  return (
    <>
      <span className="arrow-btn__label">{children}</span>
      <img className="arrow-btn__icon" src={a.src} width={a.w} height={a.h} alt="" aria-hidden="true" />
    </>
  )
}

export function ArrowLink({ variant, children, className = '', ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`arrow-btn arrow-btn--${variant} ${className}`} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </a>
  )
}

export function ArrowButton({ variant, children, className = '', ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`arrow-btn arrow-btn--${variant} ${className}`} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </button>
  )
}
