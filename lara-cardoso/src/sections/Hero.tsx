import { address, links } from '../data/site';
import { Arrow, Icon } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';
import { Picture } from '../components/Picture';

const spark = 'M12 0 C 13 8, 16 11, 24 12 C 16 13, 13 16, 12 24 C 11 16, 8 13, 0 12 C 8 11, 11 8, 12 0 Z';

export function Hero() {
  return (
    <section className="wrap hero" aria-labelledby="hero-title">
      <div className="hx">
        <div className="hx-text">
          <p className="eyebrow">Cabelo &amp; Cor · Porto</p>
          <h1 className="hx-h1" id="hero-title">
            Cor com
            <br />
            <span className="u">
              assinatura.
              <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 15 C 70 7, 150 6, 297 11" fill="none" stroke="#A75C5C" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M14 21 C 90 14, 190 14, 284 17" fill="none" stroke="#A75C5C" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="hx-lede">Balayage, morena iluminada e alisamento para valorizar a tua naturalidade.</p>
          <div className="hx-actions">
            <ExternalLink className="btn" href={links.booking}>
              Marcar horário
              <span className="arr">
                <Arrow />
              </span>
            </ExternalLink>
            <a className="link" href="#servicos">
              Ver serviços
            </a>
          </div>
        </div>
        <div className="hx-art">
          <div className="hx-halo" aria-hidden="true" />
          <svg className="hx-spark s1" viewBox="0 0 24 24" aria-hidden="true">
            <path d={spark} fill="currentColor" />
          </svg>
          <svg className="hx-spark s2" viewBox="0 0 24 24" aria-hidden="true">
            <path d={spark} fill="currentColor" />
          </svg>
          <Picture
            name="lara-cardoso-recorte"
            className="hx-photo"
            alt="Lara Cardoso, cabeleireira, sentada, de cabelo comprido castanho com pontas iluminadas"
            sizes="(min-width: 768px) 460px, 340px"
            priority
          />
        </div>
      </div>
      <ul className="trust">
        <li>
          <span className="ico-c"><Icon name="drop" /></span>Avaliação e teste de mecha gratuitos
        </li>
        <li>
          <span className="ico-c"><Icon name="heart" /></span>Foco na naturalidade do teu cabelo
        </li>
        <li>
          <span className="ico-c"><Icon name="calendar" /></span>Marcação online, a qualquer hora
        </li>
        <li>
          <span className="ico-c"><Icon name="pin" /></span>
          {address.street}, {address.city}
        </li>
      </ul>
    </section>
  );
}
