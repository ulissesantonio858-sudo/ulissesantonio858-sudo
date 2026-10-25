import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { formatDateTimePT } from "@/lib/domain/time";
import { OPPORTUNITY_CATEGORIES, categoryOf, type OpportunityCategory } from "@/lib/domain/search-params";
import { getSettings } from "@/lib/settings";
import { AutoRefresh } from "@/components/client";
import { WorkerStatus } from "@/components/worker-status";
import { Flash } from "@/components/flash";
import { Badge, ConfidenceBadge, Empty, OutcomeBadge, PriorityBadge, Section, StatusBadge, label } from "@/components/ui";
import { OUTCOME_MESSAGE, type SearchOutcome } from "@/lib/pipeline/search-job";
import { cancelSearch, resumeSearch } from "../../../actions";

const PRIO = { alta: 0, media: 1, baixa: 2 } as Record<string, number>;

export default async function SearchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withUser(user.id, async (db) => {
    const s = (await db.query("select * from searches where id = $1", [id])).rows[0];
    if (!s) return null;
    const cands = (await db.query("select id, source, external_id, name, status, outcome, error, attempts, company_id from search_candidates where search_id = $1 order by status, name", [id])).rows;
    const results = (await db.query(
      `select distinct on (c.id) c.id, c.name, c.locality, c.niche, c.qualification_status, c.qualification_reasons, c.website_status, c.pipeline_stage,
         s.total, s.confidence, s.priority, s.priority_gaps,
         (select json_agg(json_build_object('type', o.type, 'observed', o.observed, 'tier', o.tier)) from opportunities o where o.company_id = c.id and o.status = 'open') opps,
         (select json_build_object('kind', ct.kind, 'value', ct.value, 'status', ct.status, 'source', e.source_type) from contacts ct left join evidences e on e.id = ct.evidence_id
            where ct.company_id = c.id and ct.kind in ('phone','email','whatsapp') order by (ct.status = 'confirmed') desc, (e.source_type = 'website') desc limit 1) contact,
         sc.source
       from search_candidates sc join companies c on c.id = sc.company_id left join scores s on s.company_id = c.id and s.is_current
       where sc.search_id = $1 and sc.status in ('done','duplicate') order by c.id`, [id])).rows;
    const usage = (await db.query("select provider, requests, last_remaining from api_usage where day = (now() at time zone 'Europe/Lisbon')::date")).rows;
    const job = (await db.query("select status, attempts, last_error, updated_at from jobs where ref_id = $1 and type = 'search' order by created_at desc limit 1", [id])).rows[0];
    return { s, cands, results, usage, job, settings: await getSettings(db) };
  });
  if (!data) notFound();
  const { s, cands, results, usage, job, settings } = data;
  const p = s.params;
  const running = ["queued", "running", "cancel_requested"].includes(s.status);
  const wanted = new Set<string>((p.opportunityTypes as OpportunityCategory[]).flatMap((k) => [...OPPORTUNITY_CATEGORIES[k].types]));
  type R = (typeof results)[number];
  const matches = (r: R) => (r.opps ?? []).some((o: { type: string }) => wanted.has(o.type)) || p.mode === "agencies";
  const qualified = results.filter((r: R) => r.qualification_status === "qualified" && matches(r))
    .sort((a: R, b: R) => (PRIO[a.priority] ?? 9) - (PRIO[b.priority] ?? 9) || (b.total ?? 0) - (a.total ?? 0));
  const others = results.filter((r: R) => !qualified.includes(r));
  const byStatus = cands.reduce((acc: Record<string, number>, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; }, {});
  const processed = cands.filter((c) => !["pending", "processing"].includes(c.status)).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h1">Pesquisa · {p.locality} · {p.radiusKm} km</h1>
          <p className="muted">Centro: {p.centerLabel} ({p.center.lat.toFixed(4)}, {p.center.lng.toFixed(4)}) · {p.mode === "agencies" ? "agências (parceria)" : "clientes"} · criada {formatDateTimePT(s.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <AutoRefresh active={running} />
          <StatusBadge s={s.status} />
          <OutcomeBadge o={s.outcome} />
          {["queued", "running"].includes(s.status) && <form action={cancelSearch}><input type="hidden" name="id" value={id} /><button className="btn-danger">Cancelar</button></form>}
          {["cancelled", "failed"].includes(s.status) && <form action={resumeSearch}><input type="hidden" name="id" value={id} /><button className="btn">Retomar</button></form>}
        </div>
      </div>
      <WorkerStatus userId={user.id} />
      <Flash sp={sp} />
      {s.outcome && s.outcome !== "ok" && (
        <p role={s.outcome === "no_results" ? "status" : "alert"} className={`rounded-lg border p-3 text-sm ${s.outcome === "no_results" ? "border-line" : s.outcome === "partial" ? "border-warn/50 bg-warn/5" : "border-bad/50 bg-bad/10 text-bad"}`}>
          {OUTCOME_MESSAGE[s.outcome as SearchOutcome]}{s.error && !Object.values(OUTCOME_MESSAGE).includes(s.error) ? ` ${s.error}` : ""}
        </p>
      )}
      {s.warnings?.length > 0 && (
        <details className="card text-sm"><summary className="cursor-pointer">Avisos durante a verificação ({s.warnings.length})</summary>
          <ul className="mt-2 list-disc pl-5">{s.warnings.slice(0, 50).map((w: { candidate: string; note: string }, i: number) => <li key={i}>{w.candidate}: {w.note}</li>)}</ul></details>
      )}
      {job?.status === "queued" && s.status === "queued" && <p className="muted">Em fila. O processamento exige o worker ativo (<code>npm run worker</code>).</p>}

      <Section title="Progresso" id="progresso">
        <div className="mb-2 h-2 w-full overflow-hidden rounded bg-panel-2" role="progressbar" aria-valuemin={0} aria-valuemax={cands.length || 1} aria-valuenow={processed} aria-label="Candidatos processados">
          <div className="h-full bg-accent" style={{ width: `${cands.length ? (processed / cands.length) * 100 : 0}%` }} />
        </div>
        <p className="text-sm">Fase: {s.stage === "discovery" ? "descoberta" : s.stage === "processing" ? "verificação" : "concluída"} · {processed} de {cands.length} candidatos processados ·{" "}
          {Object.entries(byStatus).map(([k, v]) => `${label(k)}: ${v}`).join(" · ") || "sem candidatos ainda"}</p>
        <p className="mt-1 text-sm">Leads que passam nos critérios e no tipo de oportunidade pedido: <strong>{qualified.length}</strong>. Os restantes estados explicam-se abaixo.</p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Fontes consultadas" id="fontes">
          {s.sources_consulted.length === 0 ? <Empty>Ainda nenhuma.</Empty> : (
            <table className="table"><thead><tr><th>Fonte</th><th>Consulta</th><th>Data</th><th>Estado</th><th>Resultados</th></tr></thead><tbody>
              {s.sources_consulted.map((x: { provider: string; query: string; at: string; results: number; error?: string; status?: string }, i: number) => {
                const st = x.status ?? (x.error ? (x.error === "não configurado" ? "not_configured" : "failed") : "ok");
                return <tr key={i}><td>{x.provider}</td><td>{x.query}</td><td>{formatDateTimePT(x.at)}</td>
                  <td><Badge t={st === "ok" ? "ok" : st === "failed" ? "bad" : "warn"}>{st === "ok" ? "respondeu" : st === "failed" ? "falhou" : "não configurada"}</Badge></td>
                  <td>{st === "ok" ? x.results : <span className={st === "failed" ? "text-bad" : "text-warn"}>{x.error}</span>}</td></tr>;
              })}
            </tbody></table>
          )}
          <p className="muted mt-2">Dados de locais: Google Maps (quando usado) · © contribuidores OpenStreetMap (ODbL).</p>
        </Section>
        <Section title="Consumo hoje (Europe/Lisbon)" id="consumo">
          <table className="table"><thead><tr><th>Fornecedor</th><th>Pedidos</th><th>Limite diário</th><th>Disponível</th><th>Reportado pelo fornecedor</th></tr></thead><tbody>
            {Object.entries(settings.limits).map(([prov, lim]) => {
              const u = usage.find((x) => x.provider === prov);
              return <tr key={prov}><td>{prov}</td><td>{u?.requests ?? 0}</td><td>{lim}</td><td>{Math.max(0, lim - (u?.requests ?? 0))}</td><td>{u?.last_remaining ?? "—"}</td></tr>;
            })}
          </tbody></table>
          <p className="muted mt-2">Limites definidos por si. O custo real depende do plano de cada fornecedor; a app não estima valores em euros.</p>
        </Section>
      </div>

      <Section title={`Resultados qualificados (${qualified.length})`} id="resultados">
        {qualified.length === 0 ? <Empty>{running ? "Ainda a processar…" : s.outcome === "no_results" ? "Nenhuma empresa encontrada: as fontes responderam sem candidatos." : s.outcome === "failed" || s.outcome === "not_configured" ? "Sem resultados porque a pesquisa não chegou a correr nas fontes (ver aviso acima) — isto não significa que não existam empresas." : "Nenhum candidato passou nos critérios para os tipos de oportunidade escolhidos. Veja os outros estados abaixo."}</Empty> : <ResultsTable rows={qualified} />}
      </Section>

      <Section title={`Outros estados (${others.length})`} id="outros">
        {others.length === 0 ? <Empty>Nenhum.</Empty> : <ResultsTable rows={others} showReasons />}
      </Section>

      <Section title="Candidatos e falhas" id="candidatos">
        <div className="overflow-x-auto">
          <table className="table"><thead><tr><th>Candidato</th><th>Fonte</th><th>Estado</th><th>Resultado / motivo</th></tr></thead><tbody>
            {cands.map((c) => (
              <tr key={c.id}><td>{c.company_id ? <Link href={`/leads/${c.company_id}`}>{c.name}</Link> : c.name}</td><td>{c.source}</td><td><StatusBadge s={c.status} /></td>
                <td className="max-w-xl">{c.outcome ?? ""}{c.error && <span className="text-bad"> Erro ({c.attempts} tentativa(s)): {c.error}</span>}</td></tr>
            ))}
          </tbody></table>
        </div>
      </Section>
    </>
  );
}

function ResultsTable({ rows, showReasons = false }: { rows: Record<string, any>[]; showReasons?: boolean }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead><tr><th>Empresa</th><th>Localidade</th><th>Oportunidade</th><th>Score</th><th>Confiança</th><th>Prioridade</th><th>Contacto</th><th>Fonte</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const best = (r.opps ?? []).sort((a: { tier: string }, b: { tier: string }) => ["principal", "obstacle", "not_located", "minor"].indexOf(a.tier) - ["principal", "obstacle", "not_located", "minor"].indexOf(b.tier))[0];
            return (
              <tr key={r.id}>
                <td><Link href={`/leads/${r.id}`} className="font-semibold">{r.name}</Link><div className="text-xs text-muted">{r.niche ?? "nicho por confirmar"}</div></td>
                <td>{r.locality ?? "—"}</td>
                <td className="max-w-sm">{best ? <><Badge t="accent">{categoryLabel(best.type)}</Badge><div className="mt-1 text-xs text-muted line-clamp-2">{best.observed}</div></> : <span className="muted">—</span>}
                  {showReasons && <div className="mt-1 text-xs"><StatusBadge s={r.qualification_status} /> {(r.qualification_reasons ?? []).join("; ")} · site: {label(r.website_status)}</div>}</td>
                <td>{r.total ?? "—"}</td>
                <td><ConfidenceBadge c={r.confidence} /></td>
                <td><PriorityBadge p={r.priority} />{r.priority_gaps?.length ? <div className="mt-1 text-xs text-warn">falta: {r.priority_gaps.join("; ")}</div> : null}</td>
                <td className="text-xs">{r.contact ? <>{r.contact.kind}: {r.contact.value}<div className="text-muted">{label(r.contact.status)} · {r.contact.source}</div></> : "—"}</td>
                <td className="text-xs">{r.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function categoryLabel(type: string) {
  const c = categoryOf(type);
  return c ? OPPORTUNITY_CATEGORIES[c].label : type;
}
