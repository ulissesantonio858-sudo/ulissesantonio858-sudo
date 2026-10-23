import { useId, useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'
import type { Shot as ShotData } from '../../data/projects'
import { Shot } from './Shot'

interface Props {
  before: ShotData
  after: ShotData
  name: string
  eager?: boolean
}

/**
 * Comparação antes/depois. O input range dá arrasto (rato e toque) e teclado (setas, Home, End).
 * Os botões por baixo são a alternativa simples para mobile.
 */
export function BeforeAfter({ before, after, name, eager }: Props) {
  const [pos, setPos] = useState(50)
  const id = useId()

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-card border border-line bg-bg-2">
        <div className="absolute inset-0">
          <Shot shot={after} label={`${name}: depois`} eager={eager} />
        </div>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Shot shot={before} label={`${name}: antes`} eager={eager} />
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          Antes
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          Depois
        </span>

        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Comparar antes e depois: ${name}`}
          aria-valuetext={`${pos}% da versão anterior visível`}
          className="compare-range absolute inset-0 h-full w-full"
        />
        <div className="compare-handle pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }} aria-hidden="true">
          <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_12px_rgba(169,151,255,0.9)]" />
          <div className="compare-knob absolute top-1/2 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-bg shadow-lg">
            <ChevronsLeftRight size={18} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2" role="group" aria-label="Atalhos da comparação">
        {[
          { v: 100, l: 'Antes' },
          { v: 50, l: 'Lado a lado' },
          { v: 0, l: 'Depois' },
        ].map((b) => (
          <button
            key={b.l}
            type="button"
            onClick={() => setPos(b.v)}
            aria-pressed={pos === b.v}
            className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${
              pos === b.v ? 'bg-surface-2 text-ink ring-1 ring-line-strong' : 'text-muted hover:text-ink'
            }`}
          >
            {b.l}
          </button>
        ))}
      </div>
    </div>
  )
}
