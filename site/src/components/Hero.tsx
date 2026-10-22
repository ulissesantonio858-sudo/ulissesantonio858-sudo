import { business } from '../content/business'
import { brandName } from '../lib'
import { Photo } from './Photo'

export function Hero() {
  const local = business.localidade
  return (
    <section id="inicio" className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 pb-16 sm:px-8 md:grid-cols-12 md:gap-10 md:pt-12 md:pb-24">
      {/* No telemóvel a fotografia vem primeiro, sem texto por cima, para não tapar o rosto ou o resultado. */}
      <div className="md:order-2 md:col-span-5 md:col-start-8">
        <Photo
          photo={business.fotoAbertura}
          falta="trabalho real ou espaço"
          priority
          sizes="(min-width: 768px) 40vw, 100vw"
          className="aspect-[5/4] w-full rounded-[2px] md:aspect-[3/4]"
        />
      </div>
      <div className="flex flex-col justify-end md:order-1 md:col-span-7">
        <p className="eyebrow text-mute">
          {business.segmento}
          {local ? ` · ${local}` : ''}
        </p>
        <h1 className="display mt-5 text-[clamp(3.2rem,11vw,8.5rem)]">{brandName}</h1>
        <p className="mt-6 max-w-xl text-[clamp(1.2rem,2.2vw,1.6rem)] leading-snug text-ink/90 display !tracking-normal !leading-snug">
          {business.especialidade}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#marcar" className="btn btn-primary">
            Pedir marcação
          </a>
          <a href="#servicos" className="btn btn-ghost">
            Ver serviços e preços
          </a>
        </div>
      </div>
    </section>
  )
}
