import { business, links } from '../data/site'

export function Footer() {
  const items = [
    { label: 'Agenda', href: links.booking },
    { label: 'WhatsApp', href: links.whatsapp },
    { label: 'Instagram', href: links.instagram },
  ]
  return (
    <footer className="border-t border-cocoa/10">
      <div className="mx-auto flex max-w-page flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div>
          <p className="font-display text-[1.3rem] italic text-cocoa">{business.name}</p>
          <p className="mt-1 text-[0.88rem] text-muted">
            {business.activity} · {business.address.street}, {business.address.city}
          </p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[0.92rem]">
            {items.map((i) => (
              <li key={i.label}>
                <a
                  href={i.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-2 text-charcoal/80 underline-offset-[6px] hover:text-cocoa hover:underline"
                >
                  {i.label}
                  <span className="sr-only"> (abre numa nova janela)</span>
                </a>
              </li>
            ))}
            <li>
              <a href="#inicio" className="inline-block py-2 text-charcoal/80 underline-offset-[6px] hover:text-cocoa hover:underline">
                Voltar ao topo
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
