import { links } from '../data/site';
import { Arrow, Icon } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';
import { Picture } from '../components/Picture';

const specialties = [
  'Balayage e morena iluminada',
  'Alisamento e tratamentos capilares',
  'Avaliação individual antes de cada cor',
];

export function About() {
  return (
    <section className="wrap section" id="sobre" aria-labelledby="about-title">
      <div className="about">
        <figure className="about-photo">
          <Picture
            name="lara-cardoso-recorte"
            alt="Retrato de Lara Cardoso"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </figure>
        <div className="about-body">
          <p className="eyebrow">Sobre</p>
          <h2 className="h2" id="about-title">
            Cor pensada para ti.
            <br />
            Naturalidade em cada detalhe.
          </h2>
          <p className="who">Lara Cardoso</p>
          <p className="role">Cabeleireira · cabelo e cor · Porto</p>
          <ul className="checks">
            {specialties.map((s) => (
              <li key={s}>
                <Icon name="check" />
                {s}
              </li>
            ))}
          </ul>
          <div>
            <ExternalLink className="btn btn-ghost" href={links.instagram}>
              Ver trabalhos no Instagram
              <span className="arr">
                <Arrow up />
              </span>
            </ExternalLink>
          </div>
        </div>
      </div>
    </section>
  );
}
