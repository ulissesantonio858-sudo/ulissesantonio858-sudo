import { beforeAfter } from '../data/media'
import { Eyebrow } from './ui'

/** Só aparece quando existirem os dois ficheiros de pelo menos um par. */
export function BeforeAfter() {
  if (beforeAfter.length === 0) return null

  return (
    <section aria-labelledby="antes-depois-title" className="py-20 lg:py-28">
      <div className="mx-auto max-w-page px-5 sm:px-8 lg:px-12">
        <Eyebrow>Antes e depois</Eyebrow>
        <h2
          id="antes-depois-title"
          className="mt-5 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-[380] leading-[1] tracking-[-0.02em] text-cocoa"
        >
          Transformações
        </h2>
        <div className="mt-12 space-y-16">
          {beforeAfter.map((pair) => (
            <article key={pair.title}>
              <h3 className="font-display text-[1.5rem] text-cocoa">{pair.title}</h3>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:gap-8">
                {([['Antes', pair.before], ['Depois', pair.after]] as const).map(([label, img]) => (
                  <figure key={label}>
                    <img
                      src={img.src}
                      width={img.width}
                      height={img.height}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full rounded-photo bg-sand"
                    />
                    <figcaption className="mt-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-caramel-deep">
                      {label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
