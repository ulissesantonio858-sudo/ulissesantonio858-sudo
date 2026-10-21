import { ABOUT } from '../content/portfolio'

export function About() {
  return (
    <section className="section about" id="sobre" aria-labelledby="about-title">
      <div className="about__intro reveal">
        <p className="eyebrow">{ABOUT.eyebrow}</p>
        <h2 id="about-title" className="section__title">{ABOUT.title}</h2>
        <p className="about__text">{ABOUT.text}</p>
      </div>
      <div className="about__tracks">
        {ABOUT.tracks.map((t) => (
          <article key={t.title} className="track reveal">
            <h3 className="track__title">{t.title}</h3>
            <p>{t.text}</p>
            <ul className="chips" aria-label={`Ferramentas: ${t.title}`}>
              {t.tools.map((tool) => <li key={tool}>{tool}</li>)}
            </ul>
          </article>
        ))}
        <p className="about__base">
          Base comum a tudo: <strong>{ABOUT.base.join(', ')}</strong>.
        </p>
      </div>
    </section>
  )
}
