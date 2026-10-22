import { brandName } from '../lib'
import { NAV } from './Header'

export function Footer() {
  return (
    <footer className="border-t border-sand">
      <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-6 px-4 py-10 text-sm sm:px-8">
        <p className="display text-2xl">{brandName}</p>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-mute">
            {NAV.map((n) => <li key={n.href}><a href={n.href} className="hover:underline">{n.label}</a></li>)}
          </ul>
        </nav>
        {/* Política de privacidade: só entra com texto fornecido ou validado pelo negócio. */}
      </div>
    </footer>
  )
}
