import { business, links } from '../data/site'
import { Eyebrow } from './ui'

// Sem retrato autêntico da Lara: composição tipográfica, separada das
// fotografias de resultados.
export function About() {
  const facts = [
    { term: 'Especialidades', value: 'Balayage, morena iluminada e alisamento' },
    { term: 'Onde', value: `${business.address.street}, ${business.address.city}` },
    { term: 'Antes da cor', value: 'Avaliação / teste de mecha gratuita' },
    { term: 'Marcações', value: 'Agenda online', href: links.booking },
  ]

  return (
    <section id="sobre" aria-labelledby="sobre-title" className="scroll-mt-20 py-20 lg:py-32">
      <div className="mx-auto grid max-w-page gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-x-8 lg:px-12">
        <div className="lg:col-span-4">
          <Eyebrow>Sobre</Eyebrow>
          <h2
            id="sobre-title"
            className="mt-5 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-[380] leading-[1] tracking-[-0.02em] text-cocoa"
          >
            Lara
            <br />
            <em className="font-[340]">Cardoso</em>
          </h2>
          <p className="mt-4 text-[0.95rem] text-muted">
            {business.activity} · {business.city}
          </p>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <p className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-[360] leading-[1.25] tracking-[-0.01em] text-charcoal">
            A Lara é cabeleireira no Porto. Trabalha sobretudo a cor, em balayage e morena iluminada, e faz também
            alisamento brasileiro.
          </p>
          <div className="mt-8 max-w-xl space-y-5 text-[1.05rem] leading-relaxed text-muted">
            <p>
              O ponto de partida é o cabelo que já tens: a base natural, o comprimento, o volume e aquilo que queres ver
              ao espelho. A procura é por cor que pareça tua, com luz onde ela faz sentido e transições suaves.
            </p>
            <p>
              Se ainda não sabes que técnica escolher, começa por uma avaliação ou envia uma mensagem com a tua dúvida.
            </p>
          </div>

          <dl className="mt-12 grid border-t border-cocoa/15 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.term} className="border-b border-cocoa/15 py-5 sm:odd:pr-6 sm:even:border-l sm:even:pl-6">
                <dt className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-caramel-deep">{f.term}</dt>
                <dd className="mt-2 text-[1rem] text-charcoal">
                  {f.href ? (
                    <a
                      href={f.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-caramel underline-offset-[5px] hover:decoration-cocoa"
                    >
                      {f.value}
                      <span className="sr-only"> (abre numa nova janela)</span>
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
