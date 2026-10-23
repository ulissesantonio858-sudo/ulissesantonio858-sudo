import { ArrowUpRight } from 'lucide-react'
import { serviceGroups } from '../data/content'
import { serviceContactHref } from '../config/site'
import { SectionLabel } from './ui/SectionLabel'
import { Reveal } from './ui/Reveal'

export function Services() {
  const contact = serviceContactHref()
  return (
    <section id="servicos" className="section relative bg-bg-2/60" aria-labelledby="servicos-title">
      <div className="wrap">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <Reveal className="max-w-[640px]">
            <SectionLabel align="left">Serviços</SectionLabel>
            <h2 id="servicos-title" className="h2 mt-6">
              Preferes que eu desenvolva por ti?
            </h2>
            <p className="lead mt-5">
              Além dos prompts, ajudo negócios e profissionais a criar e melhorar a sua presença digital. Os serviços são contratados
              separadamente do pack.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <a
              href={contact.href}
              className="btn-light"
              {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              Falar sobre o meu projeto <ArrowUpRight size={18} aria-hidden="true" />
              {contact.external && <span className="sr-only">(abre {contact.label} numa nova janela)</span>}
            </a>
          </Reveal>
        </div>

        {/* linhas editoriais agrupadas */}
        <div className="mt-14 border-t border-line">
          {serviceGroups.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 60}>
              <div className="grid gap-6 border-b border-line py-8 md:grid-cols-[220px_1fr] md:gap-10 md:py-10">
                <div>
                  <span className="font-mono text-xs text-muted">0{gi + 1}</span>
                  <h3 className="mt-2 text-[24px] font-medium tracking-[-0.015em]">{g.title}</h3>
                  <p className="mt-1.5 text-[15px] text-muted">{g.intro}</p>
                </div>
                <ul className="grid gap-6 sm:grid-cols-2">
                  {g.items.map((it) => {
                    const Icon = it.icon
                    return (
                      <li key={it.title} className="flex gap-4">
                        <Icon size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-violet-light" aria-hidden="true" />
                        <div>
                          <h4 className="font-display text-[17px] font-medium">{it.title}</h4>
                          <p className="mt-1 text-[15px] leading-relaxed text-muted">{it.text}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
