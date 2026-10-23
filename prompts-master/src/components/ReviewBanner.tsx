import { useState } from 'react'
import { X } from 'lucide-react'
import { pendingItems } from '../config/site'
import { hasRealProjects } from '../data/projects'
import { unconfirmedModules } from '../data/content'

/** Aviso interno de revisão: só aparece em desenvolvimento ou com ?revisao no URL. Nunca ao visitante comum. */
export function ReviewBanner() {
  const enabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('revisao')
  const [hidden, setHidden] = useState(false)
  const items = pendingItems(hasRealProjects, unconfirmedModules)
  if (!enabled || hidden || items.length === 0) return null
  return (
    <aside aria-label="Pendências de revisão" className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-[560px] rounded-card border border-amber-300/40 bg-[#1d1708]/95 p-4 text-[14px] text-amber-100 shadow-card backdrop-blur sm:left-auto">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">Página em revisão — dados em falta</p>
        <button type="button" onClick={() => setHidden(true)} aria-label="Fechar aviso de revisão" className="-m-1 rounded p-1">
          <X size={16} />
        </button>
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-amber-100/85">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </aside>
  )
}
