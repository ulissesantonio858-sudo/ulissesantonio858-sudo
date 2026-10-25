import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { dashboardMetrics, tasksForDay } from "@/lib/crm";
import { formatDatePT, formatDateTimePT, todayLisbon } from "@/lib/domain/time";
import { integrationStatus } from "@/lib/providers/registry";
import { Empty, Notice, Section, StatusBadge } from "@/components/ui";
import { toggleTaskAction } from "../actions";

function Rate({ label, num, den }: { label: string; num: number; den: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <div className="muted">{label}</div>
      <div className="text-xl font-bold">{den ? `${Math.round((num / den) * 100)}%` : "—"}</div>
      <div className="text-xs text-muted">{num} de {den}{den === 0 ? " (sem denominador ainda)" : ""}</div>
    </div>
  );
}

export default async function Dashboard() {
  const user = await requireUser();
  const today = todayLisbon();
  const { m, tasks, searches } = await withUser(user.id, async (db) => ({
    m: await dashboardMetrics(db),
    tasks: await tasksForDay(db, today),
    searches: (await db.query("select id, params, status, stats, created_at from searches order by created_at desc limit 5")).rows,
  }));
  const missing = integrationStatus().filter((i) => !i.configured && ["google_places", "brave"].includes(i.id));
  const r = m.reached;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Painel de trabalho</h1>
          <p className="muted">Hoje é {formatDatePT(today)} (Europe/Lisbon). Indicadores calculados apenas sobre os dados registados.</p>
        </div>
        <Link href="/pesquisas/nova" className="btn no-underline">Nova pesquisa</Link>
      </div>

      {missing.length > 0 && (
        <Notice>
          Integrações por configurar: {missing.map((i) => i.label).join(", ")}. Sem elas a pesquisa usa apenas as fontes disponíveis e os estados ficam
          «não verificado» quando não há prova. <Link href="/configuracoes">Ver configurações</Link>.
        </Notice>
      )}

      <Section title={`Tarefas para hoje e em atraso (${tasks.length})`} id="tarefas">
        {tasks.length === 0 ? <Empty>Sem tarefas pendentes para hoje.</Empty> : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                <form action={toggleTaskAction}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="from" value="/" />
                  <button className="btn-ghost" aria-label={`Concluir tarefa ${t.title}`}>✓</button></form>
                <span className={t.due_date < today ? "text-bad" : ""}>{formatDatePT(t.due_date)}{t.due_time ? ` ${t.due_time.slice(0, 5)}` : ""}</span>
                <span className="font-medium">{t.title}</span>
                {t.company_id && <Link href={`/leads/${t.company_id}`}>{t.company_name}</Link>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Indicadores" id="indicadores">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {[["Candidatos analisados", m.analisados], ["Qualificados", m.qualificados], ["Contactos feitos", r.contacto_feito], ["Respostas", r.respondeu],
            ["Reuniões", r.reuniao_marcada], ["Propostas", r.proposta_enviada], ["Contratos ganhos", r.ganho]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border border-line bg-panel-2 p-3"><div className="muted">{l}</div><div className="text-2xl font-bold">{v as number}</div></div>
          ))}
        </div>
        <h3 className="mt-4 mb-2 font-semibold">Taxas (numerador de denominador)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Rate label="Qualificados / analisados" num={m.qualificados} den={m.analisados} />
          <Rate label="Contactados / qualificados" num={r.contacto_feito} den={m.qualificados} />
          <Rate label="Respostas / contactados" num={r.respondeu} den={r.contacto_feito} />
          <Rate label="Reuniões / respostas" num={r.reuniao_marcada} den={r.respondeu} />
          <Rate label="Propostas / reuniões" num={r.proposta_enviada} den={r.reuniao_marcada} />
          <Rate label="Ganhos / propostas" num={r.ganho} den={r.proposta_enviada} />
        </div>
        <p className="muted mt-2">As etapas contam empresas que passaram por elas (histórico), mesmo que depois tenham sido perdidas.</p>
      </Section>

      <Section title="Qualidade da pesquisa (revisão manual)" id="qualidade">
        <p className="mb-2 text-sm">
          Precisão: <strong>{m.quality.revistos ? `${Math.round((m.quality.adequados / m.quality.revistos) * 100)}%` : "—"}</strong>{" "}
          ({m.quality.adequados} adequados em {m.quality.revistos} revistos). Qualificados ainda por rever: {m.quality.porRever}.
        </p>
        <p className="muted">A precisão é calculada só sobre leads revistos manualmente; com amostras pequenas é pouco fiável e não garante resultados.</p>
        {m.quality.reasons.length > 0 && <p className="mt-2 text-sm">Motivos de descarte mais comuns: {m.quality.reasons.map((x: { r: string; n: number }) => `${x.r} (${x.n})`).join(", ")}</p>}
        {m.quality.errors.length > 0 && <p className="mt-1 text-sm">Erros de pesquisa registados: {m.quality.errors.map((x: { e: string; n: number }) => `${x.e} (${x.n})`).join(", ")}</p>}
      </Section>

      <Section title="Pesquisas recentes" id="pesquisas">
        {searches.length === 0 ? <Empty>Ainda não há pesquisas. Comece por <Link href="/pesquisas/nova">uma nova pesquisa</Link> ou importe um CSV nas configurações.</Empty> : (
          <table className="table"><thead><tr><th>Data</th><th>Localidade</th><th>Estado</th><th>Candidatos</th></tr></thead><tbody>
            {searches.map((s) => (
              <tr key={s.id}><td><Link href={`/pesquisas/${s.id}`}>{formatDateTimePT(s.created_at)}</Link></td><td>{s.params.locality} · {s.params.radiusKm} km</td>
                <td><StatusBadge s={s.status} /></td><td>{s.stats?.candidates ?? 0}</td></tr>
            ))}
          </tbody></table>
        )}
      </Section>
    </>
  );
}
