import { pending } from '../lib'

/** Visível apenas enquanto houver conteúdo por confirmar; o build de produção não passa nesse estado. */
export function PreviewBanner() {
  if (!pending.length) return null
  return (
    <aside className="bg-ink text-paper on-dark" aria-label="Estado da prévia">
      <details className="mx-auto max-w-7xl px-4 py-2 text-sm sm:px-8">
        <summary className="cursor-pointer select-none">
          <strong className="font-semibold">Prévia de revisão.</strong> {pending.length} itens por confirmar — nada
          aqui é informação do negócio até ser validado.
        </summary>
        <ul className="mt-2 grid gap-x-8 gap-y-1 pb-2 text-paper/80 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((p) => (
            <li key={p}>— {p}</li>
          ))}
        </ul>
      </details>
    </aside>
  )
}
