import { useState } from 'react'
import { business } from '../content/business'
import { chooseService, fmtDuracao, fmtPreco } from '../lib'

const categorias = [...new Set(business.servicos.map((s) => s.categoria))]

export function Services() {
  const [cat, setCat] = useState<string>('Todos')
  const lista = business.servicos.filter((s) => cat === 'Todos' || s.categoria === cat)
  const condicoes = business.servicos.filter((s) => s.precoDesde)

  return (
    <section id="servicos" className="bg-stone/60" aria-labelledby="servicos-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <h2 id="servicos-t" className="display text-[clamp(2.4rem,6vw,4.5rem)]">
            Serviços
          </h2>
          <p className="mt-5 max-w-sm text-mute">
            Compare duração e preço e escolha o serviço — a mensagem de marcação segue já com o nome dele. Se não
            souber qual escolher, peça a avaliação.
          </p>
          {categorias.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filtrar por área">
              {['Todos', ...categorias].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={cat === c}
                  onClick={() => setCat(c)}
                  className={`btn !min-h-10 !px-4 text-sm ${cat === c ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-8">
          <div className="hidden grid-cols-[1fr_6rem_6rem_auto] gap-6 pb-3 text-xs font-semibold tracking-[0.14em] text-mute uppercase sm:grid">
            <span>Serviço</span>
            <span>Duração</span>
            <span>Preço</span>
            <span className="sr-only">Ação</span>
          </div>
          <ul className="border-t border-sand">
            {lista.map((s) => {
              const dur = fmtDuracao(s.duracao)
              const preco = fmtPreco(s)
              return (
                <li key={s.id} className="border-b border-sand py-6 sm:grid sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-baseline sm:gap-6">
                  <div>
                    <h3 className="display text-2xl !leading-tight sm:text-[1.7rem]">{s.nome}</h3>
                    <p className="mt-2 max-w-md text-[0.95rem] text-mute">{s.descricao}</p>
                    {s.exemplo && <p className="mt-2 text-xs font-semibold text-clay">Serviço de exemplo — a confirmar</p>}
                  </div>
                  <div className="mt-4 flex items-center gap-5 text-sm sm:contents">
                    <p className={dur ? '' : 'text-mute'}>
                      <span className="text-mute sm:sr-only">Duração </span>
                      {dur ?? 'a confirmar'}
                    </p>
                    <p className={preco ? 'font-semibold' : 'text-mute'}>
                      <span className="font-normal text-mute sm:sr-only">Preço </span>
                      {preco ?? 'a confirmar'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-ghost ml-auto !min-h-10 !px-4 text-sm sm:ml-0 sm:self-center"
                      onClick={() => chooseService(s.id)}
                      aria-label={`Marcar ${s.nome}`}
                    >
                      Marcar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {condicoes.map((s) => (
            <p key={s.id} className="mt-4 text-sm text-mute">
              {s.nome}, preço “desde”: {s.precoDesde!.condicao}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
