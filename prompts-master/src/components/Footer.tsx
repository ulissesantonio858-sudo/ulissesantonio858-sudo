import { nav } from '../data/content'
import { site } from '../config/site'
import { BuyButton } from './ui/BuyButton'
import { Logo } from './Header'
import { Reveal } from './ui/Reveal'

export function FinalCta() {
  return (
    <section className="relative overflow-hidden pb-24 pt-8 md:pb-32" aria-labelledby="cta-title">
      <div aria-hidden="true" className="light-seam -mb-10 opacity-70" />
      <Reveal className="wrap relative text-center">
        <h2 id="cta-title" className="h2 mx-auto max-w-[720px]">
          O teu próximo site começa com uma boa direção.
        </h2>
        <p className="lead mx-auto mt-5 max-w-[560px]">Analisa, adapta e cria com um método claro, do primeiro prompt à revisão final.</p>
        <div className="mt-9 flex justify-center">
          <BuyButton />
        </div>
      </Reveal>
    </section>
  )
}

export function Footer() {
  const contacts = [
    site.contact.email && { label: site.contact.email, href: `mailto:${site.contact.email}` },
    site.contact.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${site.contact.whatsapp}` },
    { label: 'LinkedIn', href: site.social.linkedin },
    { label: 'GitHub', href: site.social.github },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <footer className="border-t border-line bg-bg-2/70">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-[340px] text-[15px] text-muted">
            Prompts de engenharia reversa e desenvolvimento de sites. Criado por {site.author}, em Portugal.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <h2 className="font-display text-[15px] font-medium">Navegação</h2>
          <ul className="mt-4 space-y-2.5">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="text-[15px] text-muted transition hover:text-ink">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-[15px] font-medium">Contacto</h2>
          <ul className="mt-4 space-y-2.5">
            {contacts.map((c) => (
              <li key={c.href}>
                <a href={c.href} target={c.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className="text-[15px] text-muted transition hover:text-ink">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="wrap flex flex-col gap-3 border-t border-line py-6 text-[14px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.brand}, por {site.author}.
        </p>
        {site.legal.length > 0 && (
          <ul className="flex gap-5">
            {site.legal.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  )
}
