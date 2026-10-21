import { CONTACT_CONFIG, HERO, SITE } from '../content/portfolio'
import { media } from '../media'
import { ArrowLink } from './ArrowButton'
import { Navigation, type NavLink } from './Navigation'

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', file: 'facebook.svg', w: 72, h: 75, href: CONTACT_CONFIG.facebook },
  { key: 'instagram', label: 'Instagram', file: 'instagram.svg', w: 65, h: 62, href: CONTACT_CONFIG.instagram },
  { key: 'whatsapp', label: 'WhatsApp', file: 'whatsapp.svg', w: 73, h: 63, href: CONTACT_CONFIG.whatsapp },
].filter((s): s is typeof s & { href: string } => Boolean(s.href))

export function Hero({ links }: { links: NavLink[] }) {
  return (
    <div className="hero" id="inicio">
      <div className="hero__frame">
        <img
          className="hero__portrait"
          src={media('hero-ulisses-1813.webp')}
          srcSet={`${media('hero-ulisses-960.webp')} 960w, ${media('hero-ulisses-1813.webp')} 1813w`}
          sizes="(min-width: 1200px) 95vw, (min-width: 900px) 55vw, 100vw"
          width={1813}
          height={1110}
          alt="Retrato de Ulisses Antônio, de t-shirt preta, com iluminação roxa"
          fetchPriority="high"
          decoding="async"
        />

        <header className="hero__bar">
          <a className="hero__brand" href="#inicio">
            {SITE.brand}
          </a>
          <Navigation links={links} />
          <ArrowLink variant="dark" className="hero__topcta" href="#contacto">
            {HERO.topCta}
          </ArrowLink>
        </header>

        <h1 className="hero__title">
          <span className="hero__l1">Developer</span> <span className="hero__amp">&amp;</span>{' '}
          <span className="hero__l3">Web Designer</span>
        </h1>

        <section className="hero__pitch" aria-labelledby="pitch-title">
          <h2 id="pitch-title" className="hero__pitch-title">
            {HERO.pitchTitle}
          </h2>
          <p className="hero__pitch-text">{HERO.pitchText}</p>
          <ArrowLink variant="glass" className="hero__cta" href="#contacto">
            {HERO.primaryCta}
          </ArrowLink>
        </section>

        {SOCIALS.length > 0 && (
          <ul className="hero__social" aria-label="Redes sociais">
            {SOCIALS.map((s) => (
              <li key={s.key} className={`hero__social-${s.key}`}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (abre numa nova janela)`}>
                  <img src={media(s.file)} width={s.w} height={s.h} alt="" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
