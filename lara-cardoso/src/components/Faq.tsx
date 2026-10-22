import { useId, useState } from 'react'
import { faqs } from '../data/site'
import { Eyebrow } from './ui'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const baseId = useId()

  return (
    <section id="perguntas" aria-labelledby="perguntas-title" className="scroll-mt-20 py-20 lg:py-32">
      <div className="mx-auto grid max-w-page gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-x-8 lg:px-12">
        <div className="lg:col-span-4">
          <Eyebrow>Perguntas frequentes</Eyebrow>
          <h2
            id="perguntas-title"
            className="mt-5 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-[380] leading-[1] tracking-[-0.02em] text-cocoa"
          >
            Antes de
            <br />
            <em className="font-[340]">marcares.</em>
          </h2>
        </div>

        <div className="border-t border-cocoa/15 lg:col-span-7 lg:col-start-6">
          {faqs.map((item, i) => {
            const isOpen = open === i
            const btnId = `${baseId}-q${i}`
            const panelId = `${baseId}-a${i}`
            return (
              <div key={item.q} className="border-b border-cocoa/15">
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left font-display text-[1.25rem] leading-snug text-cocoa sm:text-[1.4rem]"
                  >
                    {item.q}
                    <span aria-hidden="true" className="relative h-4 w-4 shrink-0 text-caramel-deep">
                      <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                      <span
                        className={`absolute left-1/2 top-0 h-4 w-px bg-current transition-transform duration-300 ${
                          isOpen ? 'scale-y-0' : ''
                        }`}
                      />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="pb-7 pr-10">
                  <p className="max-w-xl text-[1.02rem] leading-relaxed text-muted">{item.a}</p>
                  {item.link && (
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-[0.95rem] font-medium text-cocoa underline decoration-caramel underline-offset-[6px] hover:decoration-cocoa"
                    >
                      {item.link.label}
                      <span className="sr-only"> (abre numa nova janela)</span>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
