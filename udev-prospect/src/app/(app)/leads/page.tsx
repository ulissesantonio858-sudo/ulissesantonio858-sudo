import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { STAGES, stageLabel } from "@/lib/crm";
import { NICHES } from "@/lib/domain/niches";
import { formatDateTimePT } from "@/lib/domain/time";
import { ConfidenceBadge, Empty, PriorityBadge, StatusBadge, label } from "@/components/ui";

type SP = { q?: string; prioridade?: string; qualificacao?: string; etapa?: string; nicho?: string; confianca?: string; agencia?: string; site?: string };

export default async function Leads({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const where: string[] = [];
  const vals: unknown[] = [];
  const add = (sql: string, v: unknown) => { vals.push(v); where.push(sql.replace("?", `$${vals.length}`)); };
  if (sp.q) add("(c.name ilike ? or c.locality ilike $X or c.domain ilike $X or exists (select 1 from activities a where a.company_id = c.id and a.type = 'note' and a.body ilike $X))".replace(/\$X/g, `$${vals.length + 1}`), `%${sp.q}%`);
  if (sp.prioridade) add("s.priority = ?", sp.prioridade);
  if (sp.qualificacao) add("c.qualification_status = ?", sp.qualificacao);
  if (sp.etapa) add("c.pipeline_stage = ?", sp.etapa);
  if (sp.nicho) add("c.niche = ?", sp.nicho);
  if (sp.confianca) add("s.confidence = ?", sp.confianca);
  if (sp.site) add("c.website_status = ?", sp.site);
  if (sp.agencia === "sim") where.push("c.is_agency"); else if (sp.agencia === "nao") where.push("not c.is_agency");
  const rows = await withUser(user.id, async (db) => (await db.query(
    `select c.id, c.name, c.locality, c.niche, c.niche_status, c.pipeline_stage, c.qualification_status, c.website_status, c.last_verified_at, c.is_agency,
       s.total, s.confidence, s.priority,
       (select o.observed from opportunities o where o.company_id = c.id and o.status = 'open'
          order by case o.tier when 'principal' then 0 when 'obstacle' then 1 when 'not_located' then 2 else 3 end limit 1) opp,
       (select json_build_object('kind', ct.kind, 'value', ct.value, 'status', ct.status, 'source', e.source_type) from contacts ct left join evidences e on e.id = ct.evidence_id
          where ct.company_id = c.id and ct.kind in ('phone','email','whatsapp') order by (ct.status = 'confirmed') desc, (e.source_type = 'website') desc limit 1) contact,
       (select string_agg(distinct e.source_type, ', ') from evidences e where e.company_id = c.id and e.superseded_at is null and e.source_type not in ('ai')) sources
     from companies c left join scores s on s.company_id = c.id and s.is_current
     ${where.length ? "where " + where.join(" and ") : ""}
     order by case s.priority when 'alta' then 0 when 'media' then 1 when 'baixa' then 2 else 3 end, s.total desc nulls last, c.updated_at desc limit 300`, vals)).rows);
  const sel = (name: keyof SP, labelTxt: string, opts: [string, string][]) => (
    <div><label htmlFor={name} className="label">{labelTxt}</label>
      <select id={name} name={name} defaultValue={sp[name] ?? ""} className="input"><option value="">Todos</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">Leads ({rows.length})</h1>
        <div className="flex gap-2"><a href="/api/export" className="btn-ghost no-underline">Exportar CSV</a><Link href="/configuracoes#adicionar" className="btn no-underline">Adicionar manualmente</Link></div>
      </div>
      <form className="card grid gap-3 md:grid-cols-4 lg:grid-cols-8" role="search" aria-label="Filtrar leads">
        <div className="md:col-span-2"><label htmlFor="q" className="label">Pesquisa interna</label><input id="q" name="q" defaultValue={sp.q ?? ""} className="input" placeholder="nome, localidade, domínio, notas" /></div>
        {sel("prioridade", "Prioridade", [["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]])}
        {sel("qualificacao", "Qualificação", [["qualified", "Qualificado"], ["review", "Para revisão"], ["discarded", "Descartado"], ["pending", "Pendente"]])}
        {sel("etapa", "Etapa", STAGES.map(([k, l]) => [k, l]))}
        {sel("nicho", "Nicho", NICHES.map((n) => [n.key, n.label]))}
        {sel("confianca", "Confiança", [["alto", "Alta"], ["medio", "Média"], ["baixo", "Baixa"]])}
        {sel("site", "Site", [["confirmed", "Confirmado"], ["not_located", "Não localizado"], ["not_verified", "Não verificado"], ["unreachable", "Inacessível"], ["blocked", "Bloqueado"], ["conflict", "Em conflito"]])}
        {sel("agencia", "Agências", [["sim", "Só agências"], ["nao", "Sem agências"]])}
        <div className="flex items-end"><button className="btn">Filtrar</button></div>
      </form>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>Sem leads para estes filtros. Os leads aparecem depois de uma pesquisa, importação CSV ou registo manual.</Empty> : (
          <table className="table">
            <thead><tr><th>Empresa</th><th>Localidade</th><th>Oportunidade</th><th>Confiança</th><th>Prioridade</th><th>Contacto</th><th>Fonte</th><th>Etapa</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/leads/${r.id}`} className="font-semibold">{r.name}</Link>
                    <div className="text-xs text-muted">{r.is_agency ? "agência · " : ""}{r.niche ?? "nicho ?"}{r.niche_status === "inferred" ? " (inferido)" : ""} · verificado {formatDateTimePT(r.last_verified_at)}</div></td>
                  <td>{r.locality ?? "—"}</td>
                  <td className="max-w-sm text-xs">{r.opp ?? <span className="text-muted">nenhuma documentada</span>}<div className="mt-1"><StatusBadge s={r.qualification_status} /> <span className="text-muted">site: {label(r.website_status)}</span></div></td>
                  <td><ConfidenceBadge c={r.confidence} /></td>
                  <td><PriorityBadge p={r.priority} /><div className="text-xs text-muted">{r.total != null ? `${r.total}/100` : ""}</div></td>
                  <td className="text-xs">{r.contact ? <>{r.contact.kind}: {r.contact.value}<div className="text-muted">{label(r.contact.status)} · {r.contact.source}</div></> : "—"}</td>
                  <td className="text-xs">{r.sources ?? "—"}</td>
                  <td className="text-xs">{stageLabel(r.pipeline_stage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
