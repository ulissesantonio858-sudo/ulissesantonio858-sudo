import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { categories, hasRealProjects, projects, type CategoryId, type Project } from '../data/projects'
import { SectionLabel } from './ui/SectionLabel'
import { BeforeAfter } from './ui/BeforeAfter'
import { Shot } from './ui/Shot'
import { Reveal } from './ui/Reveal'

const categoryLabel = (id: CategoryId) => categories.find((c) => c.id === id)?.label ?? id

function DemoTag({ demo }: { demo: boolean }) {
  if (!demo) return null
  return <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">Demonstração</span>
}

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  // <dialog> nativo: foco preso, Esc e regresso do foco tratados pelo browser.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (project && !el.open) el.showModal()
    if (!project && el.open) el.close()
  }, [project])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(920px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-panel border border-line-strong bg-surface p-0 text-ink shadow-glow"
    >
      {project && (
        <div className="p-5 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-violet-light">{categoryLabel(project.category)}</p>
              <h3 id="dialog-title" className="mt-1 text-2xl font-medium tracking-[-0.015em]">
                {project.name}
              </h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong">
              <X size={20} />
            </button>
          </div>
          {project.before ? (
            <BeforeAfter before={project.before} after={project.after} name={project.name} />
          ) : (
            <div className="aspect-[16/10] overflow-hidden rounded-card border border-line">
              <Shot shot={project.after} label={project.name} />
            </div>
          )}
          <p className="mt-6 text-muted">{project.summary}</p>
          <h4 className="mt-6 font-display text-base font-medium">O que mudou</h4>
          <ul className="mt-3 space-y-2">
            {project.changes.map((c) => (
              <li key={c} className="flex gap-3 text-muted">
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-light" />
                {c}
              </li>
            ))}
          </ul>
          {project.demo && <p className="mt-6 text-sm text-muted">Exemplo demonstrativo, criado para ilustrar o método. Não é um projeto de cliente.</p>}
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="btn-light mt-6">
              Visitar o projeto <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </dialog>
  )
}

export function Transformations() {
  const available = useMemo(() => categories.filter((c) => projects.some((p) => p.category === c.id)), [])
  const [filter, setFilter] = useState<CategoryId | 'todos'>('todos')
  const [open, setOpen] = useState<Project | null>(null)

  const featured = projects.find((p) => p.featured) ?? projects[0]
  const gallery = projects.filter((p) => p.id !== featured.id && (filter === 'todos' || p.category === filter))

  return (
    <section id="transformacoes" className="section relative" aria-labelledby="transformacoes-title">
      <div className="wrap">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <SectionLabel>Transformações</SectionLabel>
          <h2 id="transformacoes-title" className="h2 mt-6">
            {hasRealProjects ? 'Da referência ao resultado.' : 'Direções que podes criar.'}
          </h2>
          <p className="lead mt-5">
            {hasRealProjects
              ? 'Vê como diferentes referências ganharam uma nova direção, adaptada ao negócio, ao conteúdo e à experiência de cada projeto.'
              : 'Exemplos demonstrativos de como uma referência pode ganhar uma nova direção, adaptada ao negócio, ao conteúdo e ao público de cada projeto.'}
          </p>
        </Reveal>

        {/* caso principal: editorial, contexto à esquerda e comparação ampla à direita (referência B) */}
        <Reveal className="mt-14 md:mt-16">
          <article className="card grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.8fr_1.4fr] lg:items-center lg:gap-12">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{categoryLabel(featured.category)}</span>
                {featured.demo && <span className="chip text-muted">Demonstração</span>}
              </div>
              <h3 className="mt-5 text-[26px] font-medium leading-tight tracking-[-0.02em]">{featured.name}</h3>
              <p className="mt-4 text-muted">{featured.summary}</p>
              <ul className="mt-6 space-y-2.5">
                {featured.changes.map((c) => (
                  <li key={c} className="flex gap-3 text-[16px] text-ink/90">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-light" />
                    {c}
                  </li>
                ))}
              </ul>
              {featured.url && (
                <a href={featured.url} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-7">
                  Visitar o projeto <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              )}
            </div>
            <div>
              {featured.before ? (
                <BeforeAfter before={featured.before} after={featured.after} name={featured.name} />
              ) : (
                <div className="aspect-[16/10] overflow-hidden rounded-card border border-line">
                  <Shot shot={featured.after} label={featured.name} />
                </div>
              )}
            </div>
          </article>
        </Reveal>

        {/* filtros */}
        <div className="mt-16 flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrar por tipo de site">
          {[{ id: 'todos' as const, label: 'Todos' }, ...available].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={`min-h-[42px] rounded-full border px-4 text-[14px] font-semibold transition ${
                filter === c.id ? 'border-violet bg-violet text-white' : 'border-line-strong text-muted hover:border-violet-light hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* galeria (referência B): miniatura, título, descrição e botão */}
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {gallery.map((p) => (
            <li key={p.id} className="card group flex flex-col p-2.5 transition hover:border-line-strong hover:bg-surface-2">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[12px]">
                <Shot shot={p.after} label={`${p.name}: resultado`} />
                <div className="absolute left-2.5 top-2.5">
                  <DemoTag demo={p.demo} />
                </div>
              </div>
              <div className="flex flex-1 flex-col px-2.5 pb-3 pt-4">
                <p className="text-[13px] font-semibold text-violet-light">{categoryLabel(p.category)}</p>
                <h3 className="mt-1.5 text-[19px] font-medium leading-snug tracking-[-0.01em]">{p.name}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{p.summary}</p>
                <button type="button" onClick={() => setOpen(p)} className="btn-light mt-5 min-h-[40px] self-start px-4 text-[14px]">
                  Ver detalhes
                </button>
              </div>
            </li>
          ))}
          {gallery.length === 0 && (
            <li className="col-span-full text-center text-muted">Ainda não há outros exemplos nesta categoria.</li>
          )}
        </ul>
      </div>

      <ProjectDialog project={open} onClose={() => setOpen(null)} />
    </section>
  )
}
