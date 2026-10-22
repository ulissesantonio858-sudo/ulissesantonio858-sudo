import { galleryOrder, getMedia } from '../data/media'
import type { MediaItem } from '../data/media'
import { AnimatedPhoto } from './AnimatedPhoto'
import { Eyebrow } from './ui'

// Composição editorial no computador (grelha de 12 colunas): larguras e
// desníveis controlados. Os estilos seguem a ordem das fotografias disponíveis.
const layout = [
  { cls: 'lg:col-span-5', vw: 40, max: 530 },
  { cls: 'lg:col-span-3 lg:col-start-7 lg:mt-40', vw: 24, max: 310 },
  { cls: 'lg:col-span-3 lg:col-start-10 lg:mt-12', vw: 24, max: 310 },
  { cls: 'lg:col-span-4 lg:col-start-2', vw: 32, max: 420 },
  { cls: 'lg:col-span-5 lg:col-start-7 lg:-mt-48', vw: 40, max: 530 },
  { cls: 'lg:col-span-3 lg:col-start-2', vw: 24, max: 310 },
]

function sizesFor(i: number) {
  const l = layout[i] ?? { vw: 32, max: 420 }
  return `(min-width: 1440px) ${l.max}px, (min-width: 1024px) ${l.vw}vw, (min-width: 640px) 50vw, 100vw`
}

export function Gallery() {
  const items = galleryOrder.map((id) => getMedia(id)).filter((m): m is MediaItem => Boolean(m))
  const hasVideo = items.some((m) => m.video)

  return (
    <section id="resultados" aria-labelledby="resultados-title" className="scroll-mt-20 bg-sand/45 py-20 lg:py-32">
      <div className="mx-auto max-w-page px-5 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Eyebrow>Resultados</Eyebrow>
            <h2
              id="resultados-title"
              className="mt-5 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-[380] leading-[1] tracking-[-0.02em] text-cocoa"
            >
              Trabalhos
              <br />
              <em className="font-[340]">da Lara.</em>
            </h2>
          </div>
          <p className="max-w-md self-end text-[1.05rem] leading-relaxed text-muted lg:col-span-4 lg:col-start-8">
            Uma seleção de resultados publicados pela Lara, do loiro ao ruivo.
            {hasVideo && ' As fotografias com o botão de reprodução têm uma animação curta.'}
          </p>
        </div>

        <ul className="mt-14 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-16">
          {items.map((item, i) => (
            <li key={item.id} className={layout[i]?.cls ?? 'lg:col-span-4'}>
              <figure>
                <AnimatedPhoto
                  item={item}
                  mode="gallery"
                  sizes={sizesFor(i)}
                />
                <figcaption className="mt-3 flex items-baseline gap-3 text-[0.9rem] text-charcoal">
                  <span className="text-[0.7rem] tracking-[0.2em] text-caramel-deep">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
