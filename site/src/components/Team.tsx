import { business } from '../content/business'
import { Photo } from './Photo'

export function Team() {
  const equipa = business.profissionais
  if (!equipa.length) return null
  return (
    <section id="equipa" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 md:py-24" aria-labelledby="equipa-t">
      <h2 id="equipa-t" className="display text-[clamp(2.4rem,6vw,4.5rem)]">
        Quem faz
      </h2>
      <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {equipa.map((p, i) => (
          <li key={p.nome ?? i}>
            <Photo
              photo={p.foto}
              falta="retrato do profissional"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="aspect-[4/5] w-full"
            />
            <h3 className="display mt-5 text-3xl">{p.nome ?? 'Nome a confirmar'}</h3>
            <p className="mt-1 text-sm text-mute">{p.funcao ?? 'Função a confirmar'}</p>
            {p.especialidades.length > 0 && (
              <p className="mt-3 text-sm">
                <span className="font-semibold">Especialidades:</span> {p.especialidades.join(', ')}
              </p>
            )}
            <p className={`mt-3 text-[0.95rem] ${p.formaDeTrabalhar ? '' : 'text-mute'}`}>
              {p.formaDeTrabalhar ?? 'Como trabalha, em poucas frases, nas palavras da própria pessoa.'}
            </p>
            {p.qualificacoes.length > 0 && (
              <ul className="mt-3 text-sm text-mute">
                {p.qualificacoes.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
