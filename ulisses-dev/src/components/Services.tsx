import { useRef, useState, type KeyboardEvent } from 'react'
import { DEFAULT_SERVICE, SERVICES, SERVICES_INTRO, type ServiceId } from '../content/portfolio'
import { ArrowButton } from './ArrowButton'
import { ServiceVisual } from './ServiceVisual'

export function Services({ onTalk }: { onTalk: (id: ServiceId) => void }) {
  const [active, setActive] = useState<ServiceId>(DEFAULT_SERVICE)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const index = SERVICES.findIndex((s) => s.id === active)
  const service = SERVICES[index]

  const select = (i: number, focus = false) => {
    const next = (i + SERVICES.length) % SERVICES.length
    setActive(SERVICES[next].id)
    if (focus) tabRefs.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: SERVICES.length - 1,
    }
    if (e.key in keys) {
      e.preventDefault()
      select(keys[e.key], true)
    }
  }

  const talk = () => {
    dialogRef.current?.close()
    onTalk(active)
  }

  return (
    <section className="services" id="servicos" aria-labelledby="services-title">
      <div className="services__head reveal">
        <h2 id="services-title" className="services__title">
          {SERVICES_INTRO.title}
        </h2>
        <p className="services__intro">{SERVICES_INTRO.text}</p>
      </div>

      <div className="tabs" role="tablist" aria-label="Serviços" onKeyDown={onKeyDown}>
        {SERVICES.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={s.id === active}
            aria-controls="service-panel"
            tabIndex={s.id === active ? 0 : -1}
            className="tabs__tab"
            onClick={() => select(i)}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <div className="service-card" role="tabpanel" id="service-panel" aria-labelledby={`tab-${active}`}>
        <div className="service-card__visual" key={`v-${active}`}>
          <ServiceVisual id={active} />
        </div>
        <div className="service-card__body" key={`b-${active}`}>
          <h3 className="service-card__title">{service.title}</h3>
          <p className="service-card__text">{service.summary}</p>
          <ArrowButton
            variant="outline"
            className="service-card__more"
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            Saber mais
          </ArrowButton>
        </div>
      </div>

      <div className="dots" aria-hidden="true">
        {SERVICES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            className="dots__dot"
            data-active={s.id === active}
            onClick={() => select(i)}
          />
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="service-dialog"
        aria-labelledby="service-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
      >
        <div className="service-dialog__inner">
          <h3 id="service-dialog-title" className="service-dialog__title">
            {service.title}
          </h3>
          <p>{service.summary}</p>
          <ul className="service-dialog__list">
            {service.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {service.note && <p className="service-dialog__note">{service.note}</p>}
          <div className="service-dialog__actions">
            <ArrowButton variant="glass" onClick={talk}>
              Conversar sobre este serviço
            </ArrowButton>
            <button type="button" className="text-btn" onClick={() => dialogRef.current?.close()}>
              Fechar
            </button>
          </div>
        </div>
      </dialog>
    </section>
  )
}
