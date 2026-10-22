import { business } from '../content/business'
import { brandName } from '../lib'

export function Contact() {
  const m = business.morada
  return (
    <section id="contacto" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-12 md:py-24" aria-labelledby="contacto-t">
      <h2 id="contacto-t" className="display text-[clamp(2.4rem,6vw,4.5rem)] md:col-span-4">
        Como chegar
      </h2>
      <div className="md:col-span-4">
        <h3 className="eyebrow text-mute">Morada</h3>
        {m ? (
          <address className="mt-3 not-italic text-lg">
            {m.rua}
            <br />
            {m.codigoPostal} {m.cidade}
          </address>
        ) : (
          <p className="mt-3 text-mute">Morada a confirmar.</p>
        )}
        {business.direcoes && <p className="mt-4 text-mute">{business.direcoes}</p>}
        {business.mapaUrl && (
          <a href={business.mapaUrl} target="_blank" rel="noopener" className="btn btn-ghost mt-6">
            Abrir no mapa
          </a>
        )}
        <h3 className="eyebrow mt-10 text-mute">Marcações</h3>
        <ul className="mt-3 space-y-1">
          {business.marcacao.telefone && <li><a className="underline" href={`tel:${business.marcacao.telefone.replace(/\s/g, '')}`}>{business.marcacao.telefone}</a></li>}
          {business.marcacao.whatsapp && <li><a className="underline" href={`https://wa.me/${business.marcacao.whatsapp}`}>WhatsApp</a></li>}
          <li><a className="underline" href="#marcar">Pedir marcação</a></li>
        </ul>
      </div>
      <div className="md:col-span-4">
        <h3 className="eyebrow text-mute">Horário</h3>
        <table className="mt-3 w-full text-[0.95rem]">
          <caption className="sr-only">Horário de funcionamento de {brandName}</caption>
          <tbody>
            {business.horarios.map((h) => (
              <tr key={h.dia} className="border-b border-sand">
                <th scope="row" className="py-2 text-left font-normal">{h.dia}</th>
                <td className={`py-2 text-right ${h.abre ? '' : 'text-mute'}`}>
                  {h.abre && h.fecha ? `${h.abre}–${h.fecha}` : 'a confirmar'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {business.politicas && (
          <ul className="mt-6 space-y-2 text-sm text-mute">
            {business.politicas.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
      </div>
    </section>
  )
}
