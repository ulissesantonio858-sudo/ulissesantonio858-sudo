import type { CSSProperties } from 'react'
import { TECHNOLOGIES } from '../content/portfolio'

export function TechnologyStrip() {
  return (
    <section className="tech" aria-label="Tecnologias com que trabalho">
      <ul className="tech__list">
        {TECHNOLOGIES.map((t) => (
          <li key={t.name} className="tech__item" style={{ '--h': t.height } as CSSProperties}>
            <img src={`/media/${t.file}`} width={t.width} height={t.height} alt={t.name} loading="lazy" />
          </li>
        ))}
      </ul>
    </section>
  )
}
