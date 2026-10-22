import { business } from '../content/business'

export function Faq() {
  if (!business.faqs.length) return null
  return (
    <section id="duvidas" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-12 md:py-24" aria-labelledby="duvidas-t">
      <h2 id="duvidas-t" className="display text-[clamp(2.4rem,6vw,4.5rem)] md:col-span-4">
        Dúvidas
      </h2>
      <div className="border-t border-sand md:col-span-8">
        {business.faqs.map((f) => (
          <details key={f.pergunta} className="group border-b border-sand">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {f.pergunta}
              <span aria-hidden className="display text-2xl transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className={`max-w-2xl pb-6 ${f.resposta ? '' : 'text-mute'}`}>{f.resposta ?? 'Resposta a confirmar com a equipa.'}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
