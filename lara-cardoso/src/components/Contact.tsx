import { business, instagramHandle, links } from '../data/site'
import { ButtonLink, ChatIcon, Eyebrow, InstagramIcon, PinIcon } from './ui'

export function Contact() {
  return (
    <section id="contacto" aria-labelledby="contacto-title" className="scroll-mt-20 pb-16 lg:pb-24">
      <div className="mx-auto max-w-page px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 rounded-photo bg-sand px-6 py-14 sm:px-10 lg:grid-cols-12 lg:gap-x-8 lg:px-14 lg:py-20">
          <div className="lg:col-span-7">
            <Eyebrow>Contacto</Eyebrow>
            <h2
              id="contacto-title"
              className="mt-5 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-[380] leading-[0.98] tracking-[-0.025em] text-cocoa"
            >
              Marca o teu
              <br />
              <em className="font-[340] text-caramel-deep">horário.</em>
            </h2>
            <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-muted">
              Escolhe o serviço na agenda online. Se preferires falar primeiro, envia uma mensagem à Lara.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={links.booking} external>
                Marcar horário
              </ButtonLink>
              <ButtonLink href={links.whatsapp} external variant="secondary">
                <ChatIcon />
                Falar com a Lara
              </ButtonLink>
            </div>
          </div>

          <address className="not-italic lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="font-display text-[1.6rem] leading-tight text-cocoa">{business.name}</p>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-charcoal">
              {business.address.street}
              <br />
              {business.address.city}, {business.address.country}
            </p>
            <ul className="mt-7 border-t border-cocoa/15">
              <li className="border-b border-cocoa/15">
                <a
                  href={links.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center gap-3 py-3 text-[0.98rem] text-cocoa hover:text-caramel-deep"
                >
                  <PinIcon />
                  Como chegar
                  <span className="sr-only"> (abre o Google Maps numa nova janela)</span>
                </a>
              </li>
              <li className="border-b border-cocoa/15">
                <a
                  href={links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center gap-3 py-3 text-[0.98rem] text-cocoa hover:text-caramel-deep"
                >
                  <InstagramIcon />
                  Instagram <span className="text-muted">{instagramHandle}</span>
                  <span className="sr-only"> (abre numa nova janela)</span>
                </a>
              </li>
            </ul>
          </address>
        </div>
      </div>
    </section>
  )
}
