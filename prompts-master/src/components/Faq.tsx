import { useState } from 'react'
import { Plus } from 'lucide-react'
import { faq } from '../data/content'
import { SectionLabel } from './ui/SectionLabel'
import { Reveal } from './ui/Reveal'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <Reveal>
          <SectionLabel align="left">FAQ</SectionLabel>
          <h2 id="faq-title" className="h2 mt-6">
            Perguntas frequentes
          </h2>
          <p className="lead mt-5">O que precisas de saber antes de comprar o pack ou de me pedir um projeto.</p>
        </Reveal>
        <Reveal delay={100}>
          <ul className="space-y-3">
            {faq.map((item, i) => {
              const isOpen = open === i
              return (
                <li key={item.q} className={`card transition ${isOpen ? 'border-line-strong bg-surface-2' : ''}`}>
                  <h3 className="text-[17px] font-medium">
                    <button
                      type="button"
                      id={`faq-q-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 rounded-card px-5 py-5 text-left sm:px-6"
                    >
                      {item.q}
                      <Plus
                        size={20}
                        aria-hidden="true"
                        className={`shrink-0 text-violet-light transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                      />
                    </button>
                  </h3>
                  <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen} className="px-5 pb-6 sm:px-6">
                    <p className="text-muted">{item.a}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
