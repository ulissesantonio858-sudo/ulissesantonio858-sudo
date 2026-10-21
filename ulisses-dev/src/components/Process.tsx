import { PROCESS } from '../content/portfolio'

export function Process() {
  return (
    <section className="section process" id="processo" aria-labelledby="process-title">
      <p className="eyebrow">{PROCESS.eyebrow}</p>
      <h2 id="process-title" className="section__title">{PROCESS.title}</h2>
      <ol className="process__list">
        {PROCESS.steps.map((s, i) => (
          <li key={s.title} className="step reveal">
            <span className="step__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="step__title">{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
