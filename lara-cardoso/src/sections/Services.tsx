import { categories, links } from '../data/site';
import { Arrow } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';
import { Picture } from '../components/Picture';

export function Services() {
  return (
    <section className="wrap section" id="servicos" aria-labelledby="svc-title">
      <div className="sec-head">
        <div>
          <p className="eyebrow">Serviços</p>
          <h2 className="h2" id="svc-title">O que podes marcar</h2>
        </div>
        <ExternalLink className="link" href={links.booking}>
          Ver tudo na agenda ↗
        </ExternalLink>
      </div>
      <div className="svc-grid">
        {categories.map((c) => (
          <article className="svc-card" key={c.title}>
            <figure className="svc-img">
              <Picture
                name={c.image}
                alt={c.alt}
                focus={c.focus}
                sizes="(min-width: 1200px) 300px, (min-width: 768px) 45vw, 112px"
              />
            </figure>
            <div className="svc-body">
              <h3>{c.title}</h3>
              <p>{c.summary}</p>
              <div className="svc-foot">
                <span>{c.from}</span>
                <ExternalLink href={links.booking} aria-label={`Marcar ${c.title.replace('&', 'e')}`}>
                  <Arrow />
                </ExternalLink>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
