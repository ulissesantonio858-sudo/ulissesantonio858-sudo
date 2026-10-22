import { getMedia } from '../data/media'
import type { Specialty } from '../data/site'
import { links, specialties } from '../data/site'
import { Photo } from './Photo'
import { ArrowIcon, ButtonLink, Eyebrow } from './ui'

function Meta({ s }: { s: Specialty }) {
  return (
    <>
      <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-muted">{s.detail}</p>
      {s.price && (
        <p className="mt-6 border-t border-cocoa/15 pt-4 text-[0.9rem] text-charcoal">
          <span className="text-muted">Valor · </span>
          {s.price}
        </p>
      )}
    </>
  )
}

function Title({ s }: { s: Specialty }) {
  return (
    <>
      <p className="font-display text-[0.95rem] italic text-caramel-deep">{s.number}</p>
      <h3 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-[380] leading-[1] tracking-[-0.02em] text-cocoa">
        {s.title}
      </h3>
      <p className="mt-5 max-w-md font-display text-[1.3rem] leading-snug text-charcoal">{s.lead}</p>
    </>
  )
}

export function Specialties() {
  const [balayage, morena, alisamento] = specialties
  const balayagePhoto = getMedia(balayage.mediaId)
  const morenaPhoto = getMedia(morena.mediaId)
  const alisamentoPhoto = getMedia(alisamento.mediaId)

  return (
    <section id="especialidades" aria-labelledby="especialidades-title" className="scroll-mt-20 py-20 lg:py-32">
      <div className="mx-auto max-w-page px-5 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>Especialidades</Eyebrow>
            <h2
              id="especialidades-title"
              className="mt-5 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-[380] leading-[1] tracking-[-0.02em] text-cocoa"
            >
              Luz, cor
              <br />e cabelo liso.
            </h2>
          </div>
          <p className="max-w-md self-end text-[1.05rem] leading-relaxed text-muted lg:col-span-4 lg:col-start-8">
            Antes de um serviço de cor, podes marcar uma avaliação ou teste de mecha na agenda, sem custo.
          </p>
        </div>

        {/* 01 — Balayage: fotografia grande à esquerda */}
        <article id={balayage.id} className="mt-16 grid scroll-mt-24 items-end gap-8 lg:mt-24 lg:grid-cols-12 lg:gap-x-8">
          {balayagePhoto && (
            <div
              className="overflow-hidden rounded-photo bg-sand lg:col-span-6"
              style={{ aspectRatio: `${balayagePhoto.width} / ${balayagePhoto.height}` }}
            >
              <Photo item={balayagePhoto} sizes="(min-width: 1440px) 640px, (min-width: 1024px) 46vw, 100vw" />
            </div>
          )}
          <div className="lg:col-span-5 lg:col-start-8 lg:pb-10">
            <Title s={balayage} />
            <Meta s={balayage} />
          </div>
        </article>

        {/* 02 — Morena iluminada: texto à esquerda, fotografia menor e deslocada */}
        <article id={morena.id} className="mt-20 grid scroll-mt-24 gap-8 lg:mt-32 lg:grid-cols-12 lg:gap-x-8">
          <div className="order-2 lg:order-1 lg:col-span-5 lg:col-start-2 lg:pt-24">
            <Title s={morena} />
            <Meta s={morena} />
          </div>
          {morenaPhoto && (
            <div className="order-1 lg:order-2 lg:col-span-4 lg:col-start-8">
              <div
                className="overflow-hidden rounded-photo bg-sand"
                style={{ aspectRatio: `${morenaPhoto.width} / ${morenaPhoto.height}` }}
              >
                <Photo item={morenaPhoto} sizes="(min-width: 1440px) 420px, (min-width: 1024px) 32vw, 100vw" />
              </div>
            </div>
          )}
        </article>

        {/* 03 — Alisamento: composição tipográfica; fotografia em dimensão moderada quando existir */}
        <article
          id={alisamento.id}
          className="mt-20 grid scroll-mt-24 gap-8 rounded-photo bg-sand px-6 py-10 sm:px-10 sm:py-14 lg:mt-32 lg:grid-cols-12 lg:gap-x-8 lg:px-14 lg:py-16"
        >
          <div className="lg:col-span-6">
            <Title s={alisamento} />
          </div>
          <div className="flex flex-col justify-end lg:col-span-5 lg:col-start-8">
            {alisamentoPhoto && (
              <div
                className="mb-8 w-full max-w-[18rem] overflow-hidden rounded-photo"
                style={{ aspectRatio: `${alisamentoPhoto.width} / ${alisamentoPhoto.height}` }}
              >
                <Photo item={alisamentoPhoto} sizes="288px" />
              </div>
            )}
            <Meta s={alisamento} />
            <a
              href={links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 self-start text-[0.95rem] font-medium text-cocoa underline decoration-caramel underline-offset-[6px] hover:decoration-cocoa"
            >
              Falar com a Lara
              <span className="sr-only"> (abre numa nova janela)</span>
            </a>
          </div>
        </article>

        <div className="mt-14 flex flex-col items-start gap-4 border-t border-cocoa/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[1rem] text-muted">Os horários disponíveis estão na agenda online.</p>
          <ButtonLink href={links.booking} external>
            Consultar a agenda
            <ArrowIcon />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
