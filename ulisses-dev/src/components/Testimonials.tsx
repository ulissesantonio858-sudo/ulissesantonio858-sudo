import type { Testimonial } from '../content/portfolio'

export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <section className="section" id="depoimentos" aria-labelledby="testimonials-title">
      <p className="eyebrow">Depoimentos</p>
      <h2 id="testimonials-title" className="section__title">O que dizem do meu trabalho</h2>
      <div className="testimonials">
        {items.map((t) => (
          <figure key={t.name} className="testimonial reveal">
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
