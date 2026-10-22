import { getMedia, heroMediaId } from '../data/media'
import { business, links, specialties } from '../data/site'
import { AnimatedPhoto } from './AnimatedPhoto'
import { ArrowIcon, ButtonLink, Eyebrow } from './ui'

export function Hero() {
  const photo = getMedia(heroMediaId)

  return (
    <section id="inicio" aria-labelledby="hero-title" className="mx-auto max-w-page px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pb-24 lg:pt-10">
      <div className="grid items-end gap-x-8 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:pb-6">
          <Eyebrow>
            {business.name} · {business.city}
          </Eyebrow>
          <h1
            id="hero-title"
            className="mt-6 font-display text-[clamp(3.1rem,11.5vw,5rem)] lg:text-[clamp(3.6rem,6vw,6rem)] font-[380] leading-[0.94] tracking-[-0.025em] text-cocoa"
          >
            A tua cor.
            <br />
            <em className="font-[340] text-caramel-deep lg:whitespace-nowrap">Com naturalidade.</em>
          </h1>
          <p className="mt-7 max-w-[30rem] text-[1.075rem] leading-relaxed text-muted sm:text-[1.15rem]">
            Balayage, morena iluminada e alisamento, com atenção ao teu cabelo e ao resultado que procuras.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={links.booking} external>
              Marcar horário
            </ButtonLink>
            <ButtonLink href="#resultados" variant="secondary">
              Explorar resultados
              <ArrowIcon className="rotate-90" />
            </ButtonLink>
          </div>
        </div>

        {photo && (
          <figure className="relative lg:col-span-5 lg:col-start-8">
            <AnimatedPhoto
              item={photo}
              mode="hero"
              priority
              aspect="4 / 5"
              sizes="(min-width: 1440px) 560px, (min-width: 1024px) 40vw, 100vw"
            />
            <figcaption className="mt-3 flex justify-between text-[0.78rem] text-muted">
              <span>{photo.label}</span>
              <span>Trabalho da Lara</span>
            </figcaption>
          </figure>
        )}
      </div>

      <ul
        aria-label="Especialidades"
        className="mt-14 grid border-y border-cocoa/10 sm:grid-cols-3 lg:mt-20"
      >
        {specialties.map((s) => (
          <li key={s.id} className="sm:[&:first-child>a]:pl-0 border-b border-cocoa/10 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0">
            <a
              href={`#${s.id}`}
              className="group flex items-baseline gap-4 py-4 transition-colors hover:text-caramel-deep sm:px-5"
            >
              <span className="text-xs tracking-[0.2em] text-caramel-deep">{s.number}</span>
              <span className="font-display text-[1.3rem] leading-tight text-cocoa group-hover:text-caramel-deep">
                {s.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
