import { Icon, type IconName } from '../components/Icon';

const steps: { icon: IconName; title: string; text: string }[] = [
  { icon: 'sparkle', title: 'Inspira-te', text: 'Explora os resultados e encontra referências para o teu cabelo.' },
  { icon: 'list', title: 'Consulta os serviços', text: 'Vê as opções e os valores disponíveis na agenda.' },
  { icon: 'chat', title: 'Esclarece as tuas dúvidas', text: 'Fala com a Lara pelo WhatsApp, se precisares de orientação.' },
  { icon: 'calendarCheck', title: 'Marca o teu horário', text: 'Escolhe o serviço e consulta a disponibilidade na BUK.' },
];

export function Steps() {
  return (
    <section className="wrap section" id="como-marcar" aria-labelledby="steps-title">
      <div className="sec-head center">
        <p className="eyebrow">Como marcar</p>
        <h2 className="h2" id="steps-title">O teu caminho até à nova cor</h2>
        <p>Quatro passos, ao teu ritmo.</p>
      </div>
      <ol className="path">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="node">
              <Icon name={s.icon} />
            </span>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
