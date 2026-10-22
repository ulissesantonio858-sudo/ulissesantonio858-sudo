import type { AnchorHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'light' | 'outline-light'

const variants: Record<Variant, string> = {
  primary: 'bg-cocoa text-ivory hover:bg-charcoal',
  secondary: 'border border-cocoa/30 text-cocoa hover:border-cocoa hover:bg-cocoa/[0.04]',
  light: 'bg-ivory text-cocoa hover:bg-sand',
  'outline-light': 'border border-ivory/35 text-ivory hover:border-ivory hover:bg-ivory/[0.06]',
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant
  external?: boolean
  children: ReactNode
}

export function ButtonLink({ variant = 'primary', external, className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <a
      {...rest}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 text-[0.95rem] font-medium tracking-[0.01em] transition-colors duration-200 ${variants[variant]} ${className}`}
    >
      {children}
      {external && <span className="sr-only"> (abre numa nova janela)</span>}
    </a>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[0.72rem] font-medium uppercase tracking-[0.22em] text-caramel-deep ${className}`}>
      {children}
    </p>
  )
}

export function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ExternalIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className}>
      <path d="M5 3h6v6M11 3 3.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChatIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
      <path
        d="M9 2.5c3.6 0 6.5 2.6 6.5 5.8S12.6 14 9 14c-.7 0-1.4-.1-2-.3L3.5 15.5l.9-3C3.2 11.5 2.5 10 2.5 8.3 2.5 5.1 5.4 2.5 9 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
      <rect x="2.5" y="2.5" width="13" height="13" rx="3.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12.9" cy="5.1" r="0.85" fill="currentColor" />
    </svg>
  )
}

export function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
      <path d="M9 16s5-4.6 5-8.6A5 5 0 0 0 4 7.4C4 11.4 9 16 9 16Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="9" cy="7.4" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
