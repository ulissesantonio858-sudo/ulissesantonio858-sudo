import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { formatDatePT, todayLisbon } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { Empty, Section } from "@/components/ui";
import { createTaskAction, toggleTaskAction } from "../../actions";

export default async function Tasks({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayLisbon();
  const { tasks, companies } = await withUser(user.id, async (db) => ({
    tasks: (await db.query("select t.*, c.name company_name from tasks t left join companies c on c.id = t.company_id order by t.done_at nulls first, t.due_date, t.due_time nulls last limit 500")).rows,
    companies: (await db.query("select id, name from companies where pipeline_stage <> 'nao_contactar' order by name limit 1000")).rows,
  }));
  const open = tasks.filter((t) => !t.done_at);
  const groups: [string, typeof tasks][] = [
    ["Em atraso", open.filter((t) => t.due_date < today)], ["Hoje", open.filter((t) => t.due_date === today)],
    ["Próximas", open.filter((t) => t.due_date > today)], ["Concluídas", tasks.filter((t) => t.done_at).slice(0, 50)],
  ];
  return (
    <>
      <h1 className="h1">Tarefas</h1>
      <Flash sp={sp} />
      <p className="muted">Datas e horas no fuso Europe/Lisbon. Hoje: {formatDatePT(today)}.</p>
      <Section title="Nova tarefa" id="nova">
        <form action={createTaskAction} className="grid gap-2 md:grid-cols-5">
          <div className="md:col-span-2"><label className="label" htmlFor="title">Tarefa</label><input id="title" name="title" required className="input" /></div>
          <div><label className="label" htmlFor="companyId">Empresa (opcional)</label><select id="companyId" name="companyId" className="input"><option value="">—</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="dueDate">Data</label><input id="dueDate" name="dueDate" type="date" required defaultValue={today} className="input" /></div>
          <div><label className="label" htmlFor="dueTime">Hora</label><input id="dueTime" name="dueTime" type="time" className="input" /></div>
          <div><button className="btn">Criar</button></div>
        </form>
      </Section>
      {groups.map(([title, list]) => (
        <Section key={title} title={`${title} (${list.length})`} id={`g-${title}`}>
          {list.length === 0 ? <Empty>Nenhuma.</Empty> : (
            <ul className="divide-y divide-line text-sm">
              {list.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                  <form action={toggleTaskAction}><input type="hidden" name="id" value={t.id} /><button className="btn-ghost" aria-label={t.done_at ? `Reabrir ${t.title}` : `Concluir ${t.title}`}>{t.done_at ? "↺" : "✓"}</button></form>
                  <span className={t.due_date < today && !t.done_at ? "text-bad" : "text-muted"}>{formatDatePT(t.due_date)}{t.due_time ? ` ${t.due_time.slice(0, 5)}` : ""}</span>
                  <span className={t.done_at ? "line-through" : "font-medium"}>{t.title}</span>
                  {t.company_id && <Link href={`/leads/${t.company_id}`}>{t.company_name}</Link>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}
    </>
  );
}
