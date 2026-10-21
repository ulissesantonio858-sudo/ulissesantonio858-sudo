import type { CSSProperties } from 'react'
import { TECHNOLOGIES } from '../content/portfolio'
import { media } from '../media'

// Faixa em movimento contínuo: a segunda cópia só existe para o loop e fica escondida
// dos leitores de ecrã. Com "reduzir movimento", mostra-se a lista estática.
function List({ clone = false }: { clone?: boolean }) {
  return (
    <ul className={`tech__list${clone ? ' tech__list--clone' : ''}`} aria-hidden={clone || undefined}>
      {TECHNOLOGIES.map((t) => (
        <li key={t.name} className="tech__item" style={{ '--h': t.height } as CSSProperties}>
          <img src={media(t.file)} width={t.width} height={t.height} alt={clone ? '' : t.name} loading="lazy" />
        </li>
      ))}
    </ul>
  )
}

export function TechnologyStrip() {
  return (
    <section className="tech" aria-label="Tecnologias com que trabalho">
      <div className="tech__viewport">
        <div className="tech__track">
          <List />
          <List clone />
        </div>
      </div>
    </section>
  )
}
