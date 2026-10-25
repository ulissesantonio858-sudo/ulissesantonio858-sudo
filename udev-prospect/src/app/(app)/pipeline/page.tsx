import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { STAGES } from "@/lib/crm";
import { Flash } from "@/components/flash";
import { ConfidenceBadge, PriorityBadge } from "@/components/ui";
import { setStageAction } from "../../actions";

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const rows = await withUser(user.id, async (db) => (await db.query(
    `select c.id, c.name, c.locality, c.pipeline_stage, s.priority, s.confidence, s.total from companies c left join scores s on s.company_id = c.id and s.is_current
     where c.qualification_status <> 'discarded' or c.pipeline_stage not in ('novo','em_verificacao')
     order by case s.priority when 'alta' then 0 when 'media' then 1 else 2 end, s.total desc nulls last limit 500`)).rows);
  return (
    <>
      <h1 className="h1">Pipeline</h1>
      <Flash sp={sp} />
      <p className="muted">Mover para «Contacto feito» só é possível registando o contacto na ficha (com confirmação). Leads descartados ainda não trabalhados não aparecem aqui.</p>
      <div className="flex gap-3 overflow-x-auto pb-4" role="list" aria-label="Etapas do pipeline">
        {STAGES.map(([key, l]) => {
          const items = rows.filter((r) => r.pipeline_stage === key);
          return (
            <section key={key} role="listitem" aria-labelledby={`st-${key}`} className="w-64 shrink-0 rounded-xl border border-line bg-panel p-2">
              <h2 id={`st-${key}`} className="mb-2 px-1 text-sm font-semibold">{l} <span className="text-muted">({items.length})</span></h2>
              <ul className="space-y-2">
                {items.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line bg-panel-2 p-2 text-sm">
                    <Link href={`/leads/${r.id}`} className="font-semibold">{r.name}</Link>
                    <div className="text-xs text-muted">{r.locality ?? ""} {r.total != null ? `· ${r.total} pts` : ""}</div>
                    <div className="mt-1 flex flex-wrap gap-1"><PriorityBadge p={r.priority} /><ConfidenceBadge c={r.confidence} /></div>
                    <form action={setStageAction} className="mt-2 flex gap-1">
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="from" value="/pipeline" />
                      <label className="sr-only" htmlFor={`m-${r.id}`}>Mover {r.name} para</label>
                      <select id={`m-${r.id}`} name="stage" defaultValue={key} className="input py-1 text-xs">
                        {STAGES.filter(([k]) => k !== "contacto_feito" || key === "contacto_feito").map(([k, lb]) => <option key={k} value={k}>{lb}</option>)}
                      </select>
                      <button className="btn-ghost px-2 py-1 text-xs">Mover</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
