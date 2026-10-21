import { CONTACT_CONFIG, SITE } from '../content/portfolio'

export function Footer() {
  const links = [
    { label: 'LinkedIn', href: CONTACT_CONFIG.linkedin },
    { label: 'GitHub', href: CONTACT_CONFIG.github },
    { label: 'Instagram', href: CONTACT_CONFIG.instagram },
    { label: 'Facebook', href: CONTACT_CONFIG.facebook },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href))

  return (
    <footer className="footer">
      <p className="footer__brand">{SITE.brand}</p>
      <p className="footer__desc">{SITE.description}</p>
      <ul className="footer__links">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
          </li>
        ))}
      </ul>
      <p className="footer__copy">© {new Date().getFullYear()} {SITE.name}</p>
    </footer>
  )
}
