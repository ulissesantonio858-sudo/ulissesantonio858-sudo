import { useEffect, useRef, useState } from 'react'
import { business, links, nav } from '../data/site'
import { ButtonLink } from './ui'

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Menu móvel: Esc fecha, foco fica dentro do painel, scroll da página bloqueado.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button') ?? [])
    focusables()[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const items = [toggleRef.current!, ...focusables()]
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      document.documentElement.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40">
      {/* Fundo separado: backdrop-filter no próprio header prenderia o painel fixo do menu. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 border-b transition-colors duration-300 ${
          scrolled || open ? 'border-cocoa/10 bg-ivory/95 backdrop-blur-md' : 'border-transparent bg-ivory'
        }`}
      />
      <div className="relative mx-auto flex h-16 max-w-page items-center justify-between gap-6 px-5 sm:px-8 lg:h-20 lg:px-12">
        <a
          href="#inicio"
          className="font-display text-[1.45rem] italic leading-none tracking-[-0.01em] text-cocoa lg:text-[1.65rem]"
          onClick={() => setOpen(false)}
        >
          {business.name}
        </a>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[0.92rem] text-charcoal/80 underline-offset-[6px] transition hover:text-cocoa hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href={links.booking} external className="!min-h-10 !px-4 text-[0.88rem] sm:!min-h-11 sm:!px-5">
            <span className="sm:hidden">Marcar</span>
            <span className="hidden sm:inline">Marcar horário</span>
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="-mr-2 flex h-11 items-center gap-2 rounded-full px-3 text-[0.92rem] text-cocoa lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movel"
            onClick={() => setOpen((v) => !v)}
          >
            <span>{open ? 'Fechar' : 'Menu'}</span>
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-current transition-transform duration-300 ${
                  open ? 'top-1.5 rotate-45' : 'top-0.5'
                }`}
              />
              <span
                className={`absolute left-0 h-px w-5 bg-current transition-transform duration-300 ${
                  open ? 'top-1.5 -rotate-45' : 'top-2.5'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="menu-movel"
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-ivory px-5 pb-10 pt-6 sm:px-8 lg:hidden"
      >
        <nav aria-label="Menu">
          <ul className="border-t border-cocoa/10">
            {nav.map((item, i) => (
              <li key={item.href} className="border-b border-cocoa/10">
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between py-5 font-display text-[2rem] leading-none text-cocoa"
                >
                  {item.label}
                  <span className="font-sans text-xs tracking-[0.2em] text-caramel-deep">0{i + 1}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 flex flex-col gap-3">
          <ButtonLink href={links.booking} external>
            Marcar horário
          </ButtonLink>
          <ButtonLink href={links.whatsapp} external variant="secondary">
            Falar com a Lara
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
