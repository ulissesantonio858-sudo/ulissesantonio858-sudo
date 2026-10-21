import type { Project } from '../content/portfolio'

export function Projects({ projects }: { projects: Project[] }) {
  return (
    <section className="section projects" id="projetos" aria-labelledby="projects-title">
      <p className="eyebrow">Projetos</p>
      <h2 id="projects-title" className="section__title">Trabalho recente</h2>
      <div className="projects__list">
        {projects.map((p) => (
          <article key={p.title} className="project reveal">
            {p.image ? (
              <img className="project__image" src={p.image} alt="" loading="lazy" />
            ) : (
              <div className="project__cover" aria-hidden="true">{p.title}</div>
            )}
            <div className="project__body">
              <h3 className="project__title">{p.title}</h3>
              <p className="project__role">{p.role}</p>
              <p>{p.summary}</p>
              {p.delivered.length > 0 && (
                <ul className="chips" aria-label="O que foi entregue">
                  {p.delivered.map((d) => <li key={d}>{d}</li>)}
                </ul>
              )}
              {p.url && (
                <a className="text-link" href={p.url} target="_blank" rel="noopener noreferrer">
                  Ver site
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
