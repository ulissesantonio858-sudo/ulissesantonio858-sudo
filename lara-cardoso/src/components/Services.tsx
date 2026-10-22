import { links, serviceGroups } from '../data/site'
import { ArrowIcon, ButtonLink } from './ui'

export function Services() {
  return (
    <section id="servicos" aria-labelledby="servicos-title" className="scroll-mt-20 bg-cocoa py-20 text-ivory lg:py-32">
      <div className="mx-auto max-w-page px-5 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-caramel">Serviços e valores</p>
            <h2
              id="servicos-title"
              className="mt-5 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-[380] leading-[1] tracking-[-0.02em]"
            >
              O que podes
              <br />
              <em className="font-[340] text-caramel">marcar.</em>
            </h2>
          </div>
          <p className="max-w-md self-end text-[1rem] leading-relaxed text-ivory/75 lg:col-span-4 lg:col-start-8">
            Alguns valores variam consoante o comprimento e o volume do cabelo. Consulta os detalhes na agenda.
          </p>
        </div>

        <div className="mt-14 gap-x-16 md:columns-2 lg:mt-20">
          {serviceGroups.map((group) => (
            <div key={group.title} className="mb-12 break-inside-avoid last:mb-0">
              <h3 className="font-display text-[1.45rem] italic text-ivory">{group.title}</h3>
              <ul className="mt-4 border-t border-ivory/15">
                {group.services.map((s) => (
                  <li key={s.name} className="flex items-baseline justify-between gap-6 border-b border-ivory/15 py-3.5">
                    <div>
                      <p className="text-[1rem] text-ivory">{s.name}</p>
                      {s.note && <p className="mt-0.5 text-[0.82rem] text-ivory/65">{s.note}</p>}
                    </div>
                    <p className="shrink-0 text-right text-[0.98rem] tabular-nums text-ivory/90 max-sm:max-w-[9rem]">
                      {s.price}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <ButtonLink href={links.booking} external variant="light">
            Consultar serviços e marcar
            <ArrowIcon />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
