import { useEffect, useId, useState } from 'react'
import { business } from '../content/business'
import { SERVICE_EVENT, bookingLinks, bookingMessage, fmtDuracao, fmtPreco } from '../lib'

const PERIODOS = ['', 'de manhã', 'à tarde', 'ao fim do dia', 'ao sábado']

/**
 * Não há sistema de reservas: este bloco não reserva nada.
 * Prepara a mensagem e entrega-a ao canal real (WhatsApp, telefone ou sistema externo).
 */
export function Booking() {
  const [servicoId, setServicoId] = useState('')
  const [periodo, setPeriodo] = useState('')
  const ids = { servico: 'servico-escolhido', periodo: useId() }

  useEffect(() => {
    const on = (e: Event) => setServicoId((e as CustomEvent<string>).detail)
    window.addEventListener(SERVICE_EVENT, on)
    return () => window.removeEventListener(SERVICE_EVENT, on)
  }, [])

  const servico = business.servicos.find((s) => s.id === servicoId)
  const links = bookingLinks(servico, periodo)
  const semCanal = !links.whatsapp && !links.telefone && !links.sistema

  return (
    <section id="marcar" className="bg-clay text-paper on-dark" aria-labelledby="marcar-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-12 md:py-24">
        <div className="md:col-span-5">
          <h2 id="marcar-t" className="display text-[clamp(2.4rem,6vw,4.5rem)]">
            Pedir marcação
          </h2>
          <p className="mt-5 max-w-md text-paper/85">
            Escolha o serviço e, se quiser, o período que prefere. A equipa responde com as horas disponíveis — a
            marcação só fica feita quando a confirmarmos.
          </p>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={ids.servico} className="block text-sm font-semibold">
                Serviço
              </label>
              <select
                id={ids.servico}
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
                className="mt-2 h-12 w-full rounded-[2px] border border-paper/40 bg-clay-deep px-3 text-paper"
              >
                <option value="">Ainda não sei — quero orientação</option>
                {business.servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
              {servico && (
                <p className="mt-2 text-sm text-paper/85" aria-live="polite">
                  {[fmtDuracao(servico.duracao) ?? 'Duração a confirmar', fmtPreco(servico) ?? 'preço a confirmar'].join(' · ')}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={ids.periodo} className="block text-sm font-semibold">
                Período preferido <span className="font-normal text-paper/75">(opcional)</span>
              </label>
              <select
                id={ids.periodo}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="mt-2 h-12 w-full rounded-[2px] border border-paper/40 bg-clay-deep px-3 text-paper"
              >
                {PERIODOS.map((p) => (
                  <option key={p} value={p}>
                    {p || 'Sem preferência'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-6 rounded-[2px] bg-clay-deep/70 p-4 text-sm">
            <span className="block text-xs font-semibold tracking-[0.14em] uppercase text-paper/70">Mensagem a enviar</span>
            <span className="mt-1 block">{bookingMessage(servico, periodo)}</span>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {links.whatsapp && (
              <a href={links.whatsapp} target="_blank" rel="noopener" className="btn bg-paper text-ink hover:bg-stone">
                Enviar por WhatsApp
              </a>
            )}
            {links.sistema && (
              <a href={links.sistema} target="_blank" rel="noopener" className="btn bg-paper text-ink hover:bg-stone">
                Ver horários disponíveis
              </a>
            )}
            {links.telefone && (
              <a href={links.telefone} className="btn btn-ghost">
                Ligar {business.marcacao.telefone}
              </a>
            )}
            {semCanal && (
              <>
                <span className="btn bg-paper text-ink" aria-disabled="true">
                  Enviar pedido
                </span>
                <p className="w-full text-sm text-paper/85" role="note">
                  Canal de marcação por configurar (WhatsApp, telefone ou sistema). Enquanto não existir, este botão não
                  envia nada.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
