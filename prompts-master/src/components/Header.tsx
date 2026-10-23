import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { nav } from '../data/content'
import { site } from '../config/site'

export function Logo() {
  return (
    <a href="#topo" className="group flex items-center gap-2.5 rounded-lg" aria-label={`${site.brand}, por ${site.author}. Voltar ao topo`}>
      <span aria-hidden="true" className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-line-strong bg-surface">
        <span className="absolute h-5 w-5 rounded-full border-[1.5px] border-violet-light" />
        <span className="h-2 w-2 rounded-full bg-violet shadow-[0_0_10px_2px_rgba(118,89,248,0.8)]" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">{site.brand}</span>
        <span className="mt-1 block text-[12px] font-medium text-muted">por {site.author}</span>
      </span>
    </a>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? 'border-b border-line bg-bg/90 backdrop-blur-md' : 'border-b border-transparent bg-bg/40 backdrop-blur-sm'
      }`}
    >
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
        Saltar para o conteúdo
      </a>
      <div className="wrap flex h-[72px] items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-muted transition hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a href="#pack" className="btn-light hidden min-h-[42px] px-5 text-[14px] sm:inline-flex">
            Conhecer o pack
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div id="menu-mobile" hidden={!open} className="lg:hidden">
        <nav aria-label="Menu móvel" className="wrap h-[calc(100dvh-72px)] overflow-y-auto pb-10 pt-4">
          <ul className="divide-y divide-line border-y border-line">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setOpen(false)} className="block py-4 font-display text-xl text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#pack" onClick={() => setOpen(false)} className="btn-primary mt-8 w-full">
            Conhecer o pack
          </a>
        </nav>
      </div>
    </header>
  )
}
