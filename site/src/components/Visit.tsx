import { business } from '../content/business'
import { Photo } from './Photo'

export function Visit() {
  const fotos = business.fotosEspaco
  return (
    <section id="visita" className="on-dark bg-ink text-paper" aria-labelledby="visita-t">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-12 md:py-24">
        <div className="md:col-span-5">
          <h2 id="visita-t" className="display text-[clamp(2.4rem,6vw,4.5rem)]">
            A visita
          </h2>
          <p className="mt-5 max-w-md text-paper/75">{business.apresentacao}</p>
          <ol className="mt-10 space-y-8">
            {business.visita.map((v, i) => (
              <li key={v.titulo} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-paper/20 pt-5">
                <span className="display text-3xl text-sand">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-semibold">{v.titulo}</h3>
                  <p className="mt-1 text-paper/75">{v.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-6 md:col-start-7 md:gap-6">
          <Photo photo={fotos[0] ?? null} falta="cabine ou receção" sizes="(min-width: 768px) 25vw, 50vw" className="col-span-2 aspect-[3/2] w-full" />
          <Photo photo={fotos[1] ?? null} falta="detalhe" sizes="(min-width: 768px) 25vw, 50vw" className="aspect-square w-full" />
          <Photo photo={fotos[2] ?? null} falta="entrada" sizes="(min-width: 768px) 25vw, 50vw" className="aspect-square w-full" />
        </div>
      </div>
    </section>
  )
}
