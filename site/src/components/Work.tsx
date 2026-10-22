import { useEffect, useRef, useState } from 'react'
import { business } from '../content/business'
import type { PortfolioItem } from '../content/types'
import { chooseService, isPreview } from '../lib'
import { Photo } from './Photo'

type Item = { item: PortfolioItem | null; servico: string; contexto: string }

// Sem portfólio, a prévia mostra três molduras para se perceber o ritmo — nunca imagens de terceiros.
const items: Item[] = business.portfolio.length
  ? business.portfolio.map((item) => ({
      item,
      servico: business.servicos.find((s) => s.id === item.servicoId)?.nome ?? '',
      contexto: item.contexto,
    }))
  : isPreview
    ? ['Rosto', 'Corpo', 'Detalhe do espaço'].map((s) => ({ item: null, servico: s, contexto: 'Contexto do trabalho a fornecer' }))
    : []

// Ritmo editorial: uma imagem grande, uma desfasada, uma recuada.
const layout = [
  { cell: 'md:col-span-7', frame: 'aspect-[4/5] md:aspect-[5/6]' },
  { cell: 'md:col-span-5 md:mt-24', frame: 'aspect-[4/5]' },
  { cell: 'md:col-span-5 md:col-start-3', frame: 'aspect-[4/5] md:aspect-square' },
]

export function Work() {
  const [index, setIndex] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (index !== null && !d.open) d.showModal()
    if (index === null && d.open) d.close()
  }, [index])

  if (!items.length) return null

  const go = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + items.length) % items.length))
  const close = () => {
    setIndex(null)
    opener.current?.focus()
  }
  const current = index === null ? null : items[index]

  return (
    <section id="trabalhos" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 md:py-24" aria-labelledby="trabalhos-t">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="trabalhos-t" className="display text-[clamp(2.4rem,6vw,4.5rem)]">
          Trabalhos
        </h2>
        <p className="max-w-sm text-mute">Cada fotografia indica o serviço realizado. Toque para ampliar.</p>
      </div>
      <ul className="mt-10 grid gap-6 md:grid-cols-12 md:gap-8">
        {items.map((it, i) => (
          <li key={i} className={layout[i % layout.length].cell}>
            <button
              type="button"
              className="group block w-full text-left"
              onClick={(e) => {
                opener.current = e.currentTarget
                setIndex(i)
              }}
              aria-label={`Ampliar: ${it.servico}`}
            >
              <Photo
                photo={it.item?.foto ?? null}
                falta={it.servico.toLowerCase()}
                sizes="(min-width: 768px) 50vw, 100vw"
                className={`w-full ${layout[i % layout.length].frame}`}
              />
            </button>
            <p className="mt-3 flex justify-between gap-4 text-sm">
              <span className="font-semibold">{it.servico}</span>
              <span className="text-mute">{it.contexto}</span>
            </p>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label="Trabalho ampliado"
        className="on-dark m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-paper backdrop:bg-ink/70"
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1)
          if (e.key === 'ArrowLeft') go(-1)
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {current && (
          <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm" aria-live="polite">
                {index! + 1} / {items.length} · {current.servico}
              </p>
              <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={close} autoFocus>
                Fechar
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center py-4">
              <Photo photo={current.item?.foto ?? null} falta={current.servico.toLowerCase()} className="h-full max-h-full w-auto max-w-full aspect-[4/5]" sizes="90vw" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => go(-1)}>
                ← Anterior
              </button>
              {current.item && (
                <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => { const id = current.item!.servicoId; close(); chooseService(id) }}>
                  Marcar este serviço
                </button>
              )}
              <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => go(1)}>
                Seguinte →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}
