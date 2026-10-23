import { links } from '../data/site';
import { Arrow, Icon, type IconName } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';

const options: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: links.booking, icon: 'calendarCheck', title: 'Marcar horário', text: 'Escolhe o serviço e o horário na agenda BUK.' },
  { href: links.whatsapp, icon: 'chat', title: 'Falar com a Lara', text: 'Tira dúvidas pelo WhatsApp antes de marcar.' },
  { href: links.instagram, icon: 'instagram', title: 'Ver resultados', text: 'Os trabalhos mais recentes no Instagram.' },
];

export function Booking() {
  return (
    <section className="wrap section" id="contacto" aria-labelledby="book-title">
      <div className="book">
        <div>
          <p className="eyebrow">Marcação</p>
          <h2 className="h2" id="book-title">
            Vamos encontrar
            <br />a tua próxima <em>cor</em>?
          </h2>
          <p className="muted" style={{ margin: '16px 0 0' }}>
            Consulta os serviços, encontra o teu horário ou fala com a Lara.
          </p>
          <ul className="book-note">
            <li>
              <Icon name="drop" />
              Avaliação gratuita
            </li>
            <li>
              <Icon name="calendar" />
              Marcação online
            </li>
          </ul>
        </div>
        <div className="book-opts">
          {options.map((o) => (
            <ExternalLink className="book-opt" href={o.href} key={o.title}>
              <span className="ico-c">
                <Icon name={o.icon} />
              </span>
              <span>
                <b>{o.title}</b>
                <span>{o.text}</span>
              </span>
              <span className="go">
                <Arrow up />
              </span>
            </ExternalLink>
          ))}
        </div>
      </div>
    </section>
  );
}
