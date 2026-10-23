import { useRef, useState, type KeyboardEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { samples, visibleModules } from '../data/content'
import { site } from '../config/site'
import { SectionLabel } from './ui/SectionLabel'
import { Reveal } from './ui/Reveal'

function ModuleCard({ m, side }: { m: (typeof visibleModules)[number]; side: 'left' | 'right' }) {
  const Icon = m.icon
  return (
    <div className="relative">
      {/* ligação ao núcleo (só desktop) */}
      <span
        aria-hidden="true"
        className={`absolute top-1/2 hidden h-px w-12 lg:block ${
          side === 'left' ? '-right-12 bg-gradient-to-r from-line-strong to-violet-light/70' : '-left-12 bg-gradient-to-l from-line-strong to-violet-light/70'
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-glow lg:block ${side === 'left' ? '-right-[3px]' : '-left-[3px]'}`}
      />
      <div className="card flex items-start gap-4 p-4 transition hover:border-line-strong sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-violet/15 text-violet-light">
          <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-[17px] font-medium leading-snug">{m.title}</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">{m.text}</p>
        </div>
      </div>
    </div>
  )
}

function Samples() {
  const [active, setActive] = useState(0)
  const [copy, setCopy] = useState<'idle' | 'ok' | 'error'>('idle')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = samples.length - 1
    let next = active
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else return
    e.preventDefault()
    setActive(next)
    setCopy('idle')
    tabs.current[next]?.focus()
  }

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(samples[active].text)
      setCopy('ok')
    } catch {
      setCopy('error')
    }
    window.setTimeout(() => setCopy('idle'), 2500)
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div role="tablist" aria-label="Excertos demonstrativos" className="flex gap-1" onKeyDown={onKey}>
          {samples.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el
              }}
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={active === i}
              aria-controls={`panel-${s.id}`}
              tabIndex={active === i ? 0 : -1}
              onClick={() => {
                setActive(i)
                setCopy('idle')
              }}
              className={`min-h-[40px] rounded-full px-4 text-[14px] font-semibold transition ${
                active === i ? 'bg-violet text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[13px] font-medium text-muted">Excerto demonstrativo</span>
      </div>
      {samples.map((s, i) => (
        <div key={s.id} role="tabpanel" id={`panel-${s.id}`} aria-labelledby={`tab-${s.id}`} hidden={active !== i} tabIndex={0} className="p-4 sm:p-6">
          <pre className="whitespace-pre-wrap break-words font-mono text-[14px] leading-[1.75] text-ink/90">{s.text}</pre>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
        <button type="button" onClick={doCopy} className="btn-ghost min-h-[42px] px-4 text-[14px]">
          {copy === 'ok' ? <Check size={16} className="text-success" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          Copiar exemplo
        </button>
        <span role="status" aria-live="polite" className={`text-[14px] ${copy === 'error' ? 'text-red-300' : 'text-success'}`}>
          {copy === 'ok' && 'Copiado para a área de transferência.'}
          {copy === 'error' && 'Não foi possível copiar. Seleciona o texto e copia manualmente.'}
        </span>
      </div>
    </div>
  )
}

export function Included() {
  const half = Math.ceil(visibleModules.length / 2)
  const left = visibleModules.slice(0, half)
  const right = visibleModules.slice(half)

  return (
    <section id="pack" className="section relative" aria-labelledby="pack-title">
      <div className="wrap">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <SectionLabel>O pack</SectionLabel>
          <h2 id="pack-title" className="h2 mt-6">
            O que está incluído
          </h2>
          <p className="lead mt-5">
            Prompts que orientam cada etapa: da análise da referência ao briefing, à criação e à reformulação de sites com IA.
            {site.deliverablesSummary && ` ${site.deliverablesSummary}.`}
          </p>
        </Reveal>

        {/* diagrama: núcleo central ligado a módulos laterais (referência C) */}
        <Reveal className="relative mt-14 md:mt-16">
          <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-12">
            <div className="order-2 space-y-4 lg:order-1">
              {left.map((m) => (
                <ModuleCard key={m.title} m={m} side="left" />
              ))}
            </div>

            <div className="order-1 flex justify-center py-4 lg:order-2 lg:py-0">
              <div className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
                <div aria-hidden="true" className="absolute inset-0 rounded-full bg-violet/30 blur-3xl" />
                <div aria-hidden="true" className="orbit-spin absolute inset-0 rounded-full border border-dashed border-line-strong" />
                <div aria-hidden="true" className="absolute inset-5 rounded-full border border-line-strong" />
                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-b from-[#8a70ff] to-violet-deep text-center shadow-glow sm:h-32 sm:w-32">
                  <span className="font-display text-[15px] font-semibold leading-tight text-white">
                    Prompts
                    <br />
                    Master
                  </span>
                </div>
              </div>
            </div>

            <div className="order-3 space-y-4">
              {right.map((m) => (
                <ModuleCard key={m.title} m={m} side="right" />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-16 max-w-[860px]">
          <h3 className="mb-5 text-center text-[22px] font-medium tracking-[-0.01em]">Vê como soa um prompt</h3>
          <Samples />
        </Reveal>
      </div>
    </section>
  )
}
