import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { formatDateTimePT } from "@/lib/domain/time";
import { Empty, OutcomeBadge, StatusBadge } from "@/components/ui";

export default async function Searches() {
  const user = await requireUser();
  const rows = await withUser(user.id, async (db) => (await db.query("select id, params, status, outcome, stats, created_at from searches order by created_at desc limit 100")).rows);
  return (
    <>
      <div className="flex items-center justify-between"><h1 className="h1">Pesquisas</h1><Link href="/pesquisas/nova" className="btn no-underline">Nova pesquisa</Link></div>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>Sem pesquisas registadas.</Empty> : (
          <table className="table"><thead><tr><th>Data</th><th>Localidade</th><th>Modo</th><th>Nichos</th><th>Estado</th><th>Candidatos</th><th>Qualificados</th></tr></thead><tbody>
            {rows.map((s) => (
              <tr key={s.id}><td><Link href={`/pesquisas/${s.id}`}>{formatDateTimePT(s.created_at)}</Link></td><td>{s.params.locality} · {s.params.radiusKm} km</td>
                <td>{s.params.mode === "agencies" ? "agências" : "clientes"}</td><td className="max-w-xs">{s.params.niches.join(", ")}</td><td><StatusBadge s={s.status} /> <OutcomeBadge o={s.outcome} /></td>
                <td>{s.stats?.candidates ?? 0}</td><td>{s.stats?.by_qualification?.qualified ?? 0}</td></tr>
            ))}
          </tbody></table>
        )}
      </div>
    </>
  );
}
