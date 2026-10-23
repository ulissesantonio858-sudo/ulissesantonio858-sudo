import type { Shot as ShotData } from '../../data/projects'
import { SiteMock } from './SiteMock'

/** Mostra uma captura real ou, nas demonstrações, uma maqueta ilustrativa. */
export function Shot({ shot, label, eager = false }: { shot: ShotData; label: string; eager?: boolean }) {
  if ('src' in shot) {
    return (
      <img
        src={shot.src}
        alt={shot.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover object-top"
        draggable={false}
      />
    )
  }
  return <SiteMock category={shot.mock} stage={shot.stage} label={label} />
}
