import { useEffect, useRef, useState } from 'react'
import { brandName } from '../lib'

export const NAV = [
  { href: '#trabalhos', label: 'Trabalhos' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#equipa', label: 'Equipa' },
  { href: '#visita', label: 'A visita' },
  { href: '#duvidas', label: 'Dúvidas' },
  { href: '#contacto', label: 'Contacto' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b border-sand/70 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <a href="#inicio" className="display text-2xl leading-none">
          {brandName}
        </a>
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex gap-7 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="underline-offset-4 hover:underline">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <a href="#marcar" className="btn btn-primary !min-h-10 !px-4 text-sm">
            Marcar
          </a>
          <button
            ref={toggle}
            type="button"
            className="btn btn-ghost !min-h-10 !px-4 text-sm lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movel"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Fechar' : 'Menu'}
          </button>
        </div>
      </div>
      <nav id="menu-movel" aria-label="Principal (móvel)" hidden={!open} className="border-t border-sand/70 lg:hidden">
        <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-8">
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} className="display block py-3 text-3xl" onClick={() => setOpen(false)}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
