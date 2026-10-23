import { Check } from 'lucide-react'
import { formatPrice, hasCheckout, site } from '../config/site'
import { visibleModules } from '../data/content'
import { BuyButton } from './ui/BuyButton'
import { Reveal } from './ui/Reveal'

export function Offer() {
  return (
    <section id="oferta" className="section relative overflow-hidden" aria-labelledby="oferta-title">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/20 blur-[140px]" />
      <div className="wrap relative">
        <Reveal>
          <div className="relative overflow-hidden rounded-panel border border-line-strong bg-gradient-to-b from-surface-2 to-surface p-6 shadow-glow sm:p-10 lg:p-14">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-light to-transparent" />
            <div className="grid gap-10 lg:grid-cols-[1.25fr_0.9fr] lg:gap-14">
              <div>
                <p className="text-sm font-semibold text-violet-light">{site.packName}</p>
                <h2 id="oferta-title" className="h2 mt-3">
                  Dá uma direção melhor ao teu próximo projeto.
                </h2>
                <p className="lead mt-5">
                  Para freelancers, web designers, programadores e quem cria sites com IA, para o próprio negócio ou para clientes.
                </p>

                <h3 className="mt-9 font-display text-[17px] font-medium">O que recebes</h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visibleModules.map((m) => (
                    <li key={m.title} className="flex gap-3 text-[16px] text-ink/90">
                      <Check size={18} className="mt-1 shrink-0 text-violet-light" aria-hidden="true" />
                      {m.title}
                    </li>
                  ))}
                </ul>
                {site.deliverablesSummary && <p className="mt-4 text-muted">{site.deliverablesSummary}.</p>}
              </div>

              <div className="flex flex-col justify-center rounded-card border border-line bg-bg/60 p-6 sm:p-8">
                {site.price ? (
                  <>
                    <p className="text-sm font-medium text-muted">Preço</p>
                    <p className="mt-1 font-display text-[48px] font-semibold leading-none tracking-[-0.03em]">{formatPrice(site.price)}</p>
                    {site.price.note && <p className="mt-2 text-muted">{site.price.note}</p>}
                  </>
                ) : null}

                {site.conditions.length > 0 && (
                  <ul className="mt-6 space-y-2">
                    {site.conditions.map((c) => (
                      <li key={c} className="flex gap-2.5 text-[15px] text-muted">
                        <Check size={16} className="mt-1 shrink-0 text-violet-light" aria-hidden="true" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                {hasCheckout ? (
                  <BuyButton className="mt-8 w-full" />
                ) : (
                  <>
                    <p className="font-display text-[22px] font-medium leading-snug">Checkout disponível em breve.</p>
                    <p className="mt-2 text-[15px] text-muted">Entretanto, podes falar comigo sobre o pack ou sobre o teu projeto.</p>
                    <a href="#servicos" className="btn-ghost mt-6 w-full">
                      Falar comigo
                    </a>
                  </>
                )}
                <p className="mt-5 text-[14px] leading-relaxed text-muted">
                  O resultado depende do briefing, dos materiais, da ferramenta usada e da revisão do projeto. O pack não inclui o
                  desenvolvimento do site.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
