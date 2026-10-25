import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { STAGES, stageLabel } from "@/lib/crm";
import { NICHES, nicheByKey } from "@/lib/domain/niches";
import { channelLink, validateDraftText, type DraftChannel } from "@/lib/domain/outreach";
import { whyContactNow, type CriterionResult } from "@/lib/domain/scoring";
import { formatDateTimePT, todayLisbon } from "@/lib/domain/time";
import { loadFacts } from "@/lib/pipeline/score";
import type { CompanyRow } from "@/lib/pipeline/repo";
import { ConfirmSubmit, CopyButton } from "@/components/client";
import { Flash } from "@/components/flash";
import { Badge, ConfidenceBadge, Empty, Notice, PriorityBadge, Section, StatusBadge, label } from "@/components/ui";
import {
  addNoteAction, createTaskAction, generateDraftsAction, logContactAction, opportunityStatusAction, overrideAction, qualityReviewAction,
  resolveConflictAction, reverifyAction, saveDraftAction, setStageAction, toggleTaskAction,
} from "../../../actions";

const CHANNEL_LABEL: Record<string, string> = { curta: "Mensagem curta (WhatsApp/Instagram)", email: "Email inicial", followup_1: "Acompanhamento 1", followup_2: "Acompanhamento 2" };
const DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const VERIF: Record<string, string> = { reproduced: "reproduzido (≥2 verificações)", single_observation: "observado 1 vez", visual_structural: "verificação visual/estrutural", documented_search: "pesquisa documentada" };

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const d = await withUser(user.id, async (db) => {
    const c = (await db.query<CompanyRow>("select * from companies where id = $1", [id])).rows[0];
    if (!c) return null;
    const q = async (sql: string) => (await db.query(sql, [id])).rows;
    const score = (await db.query("select * from scores where company_id = $1 and is_current", [id])).rows[0];
    const search = c.first_search_id ? (await db.query("select params from searches where id = $1", [c.first_search_id])).rows[0]?.params : null;
    const facts = score ? await loadFacts(db, c, { targetNiches: search?.niches ?? NICHES.map((n) => n.key), mode: c.is_agency ? "agencies" : "clients" }) : null;
    return {
      c, score, facts,
      evidences: await q("select * from evidences where company_id = $1 order by superseded_at nulls first, observed_at desc"),
      contacts: await q("select ct.*, e.source_type, e.source_url, e.method, e.observed_at from contacts ct left join evidences e on e.id = ct.evidence_id where ct.company_id = $1 order by ct.kind"),
      opps: await q("select * from opportunities where company_id = $1 order by status, case tier when 'principal' then 0 when 'obstacle' then 1 when 'not_located' then 2 else 3 end"),
      conflicts: await q("select * from conflicts where company_id = $1 order by status, created_at desc"),
      analysis: (await q("select * from site_analyses where company_id = $1 order by created_at desc limit 1"))[0],
      drafts: await q("select * from drafts where company_id = $1 order by channel"),
      tasks: await q("select * from tasks where company_id = $1 order by done_at nulls first, due_date"),
      activities: await q("select * from activities where company_id = $1 order by occurred_at desc limit 100"),
      overrides: await q("select * from overrides where company_id = $1 order by created_at desc"),
      review: (await q("select * from quality_reviews where company_id = $1"))[0],
      logged: (await q("select count(*)::int n from activities where company_id = $1 and type = 'contact_logged'"))[0].n as number,
      job: (await q("select status, last_error from jobs where ref_id = $1 and type = 'reverify' order by created_at desc limit 1"))[0],
    };
  });
  if (!d) notFound();
  const { c, score, facts } = d;
  const criteria: CriterionResult[] = score?.breakdown?.criteria ?? [];
  const dnc = c.pipeline_stage === "nao_contactar";
  const evById = new Map(d.evidences.map((e) => [e.id, e]));
  const why = facts && score ? whyContactNow(facts, { total: score.total, criteria, confidence: score.confidence, confidenceReasons: score.confidence_reasons, priority: score.priority, priorityGaps: score.priority_gaps, qualification: c.qualification_status as "qualified", qualificationReasons: c.qualification_reasons }) : null;
  const whatsapp = d.contacts.find((x) => x.kind === "whatsapp");
  const email = d.contacts.find((x) => x.kind === "email");
  const insta = d.contacts.find((x) => x.kind === "instagram" || x.kind === "facebook");

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="muted"><Link href="/leads">← Leads</Link></p>
          <h1 className="h1">{c.name}</h1>
          <p className="muted">{nicheByKey(c.niche)?.label ?? "nicho por confirmar"}{c.niche_status === "inferred" ? " (inferido)" : ""}{c.is_agency ? " · agência (parceria)" : ""} ·{" "}
            {c.address ?? c.locality ?? "localização por confirmar"}{c.distance_km != null ? ` · ${c.distance_km.toFixed(1)} km do centro` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <PriorityBadge p={score?.priority} /><ConfidenceBadge c={score?.confidence} /><StatusBadge s={c.qualification_status} />
            <Badge>identidade: {label(c.identity_status)}</Badge><Badge>localização: {label(c.location_status)}</Badge><Badge>site: {label(c.website_status)}</Badge>
            <Badge>atividade: {label(c.business_status)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form action={setStageAction} className="flex items-end gap-2">
            <input type="hidden" name="id" value={c.id} />
            <div><label htmlFor="stage" className="label">Etapa</label>
              <select id="stage" name="stage" defaultValue={c.pipeline_stage} className="input">
                {STAGES.filter(([k]) => k !== "contacto_feito" || c.pipeline_stage === "contacto_feito").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></div>
            <button className="btn-ghost">Mudar</button>
          </form>
          <form action={reverifyAction}><input type="hidden" name="id" value={c.id} /><button className="btn">Verificar novamente</button></form>
        </div>
      </div>
      <Flash sp={sp} />
      {dnc && <Notice t="bad">Marcada como «não contactar»: não são geradas sugestões de abordagem nem reverificações automáticas.</Notice>}
      {d.job && d.job.status !== "completed" && <p className="muted">Reverificação: {label(d.job.status)}{d.job.last_error ? ` — ${d.job.last_error}` : ""}</p>}

      <Section title="Porque vale a pena contactar agora?" id="porque">
        {why ? <p className="text-sm leading-relaxed">{why}</p> : <Empty>Ainda sem pontuação. Clique em «Verificar novamente» (requer o worker ativo).</Empty>}
        {c.suggested_service && <p className="mt-2 text-sm"><strong>Serviço sugerido:</strong> {c.suggested_service} <span className="muted">(sugestão a validar em conversa)</span></p>}
        <p className="muted mt-2">Última verificação: {formatDateTimePT(c.last_verified_at)}</p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Pontuação: ${score?.total ?? "—"}/100 (rubrica v${score?.rubric_version ?? "—"})`} id="score">
          {criteria.length === 0 ? <Empty>Sem pontuação.</Empty> : (
            <table className="table"><thead><tr><th>Critério</th><th>Pontos</th><th>Nível e explicação</th></tr></thead><tbody>
              {criteria.map((cr) => (
                <tr key={cr.key}><td>{cr.label}</td><td className="whitespace-nowrap font-semibold">{cr.points} / {cr.max}</td>
                  <td className="text-xs"><strong>{cr.level}</strong> — {cr.explanation}{cr.evidenceIds.length > 0 && <> · <a href={`#ev-${cr.evidenceIds[0]}`}>evidência</a></>}</td></tr>
              ))}
            </tbody></table>
          )}
          {score && <>
            <p className="mt-3 text-sm"><strong>Confiança {score.confidence === "medio" ? "média" : score.confidence === "alto" ? "alta" : "baixa"}</strong> (não é probabilidade de compra): {score.confidence_reasons.join("; ")}.</p>
            {score.priority_gaps.length > 0 && <Notice>Score elevado, mas falta para prioridade alta: {score.priority_gaps.join("; ")}.</Notice>}
            {score.breakdown?.manualPriority && <p className="mt-2 text-sm text-warn">Prioridade corrigida manualmente (calculada: {score.breakdown.computedPriority}).</p>}
            {c.qualification_reasons.length > 0 && <p className="mt-2 text-sm">Estado {label(c.qualification_status)}: {c.qualification_reasons.join("; ")}.</p>}
          </>}
        </Section>

        <Section title="Contactos profissionais publicados" id="contactos">
          {d.contacts.length === 0 ? <Empty>Nenhum contacto publicado encontrado. Nenhum contacto é deduzido ou adivinhado.</Empty> : (
            <ul className="space-y-2 text-sm">
              {d.contacts.map((ct) => (
                <li key={ct.id}><strong>{ct.kind}</strong>: {/^https?:/.test(ct.value) ? <a href={ct.value} target="_blank" rel="noopener noreferrer nofollow">{ct.value}</a> : ct.value} <StatusBadge s={ct.status} />
                  <div className="text-xs text-muted">{ct.method ?? "origem não registada"} · {ct.source_type ?? ""} {ct.source_url && <a href={ct.source_url} target="_blank" rel="noopener noreferrer nofollow">fonte</a>} · {formatDateTimePT(ct.observed_at)}</div></li>
              ))}
            </ul>
          )}
          <p className="muted mt-2">Um email publicado não confirma que a caixa recebe mensagens; um telefone não prova que exista WhatsApp.</p>
          {c.website_url && <p className="mt-2 text-sm">Site: <a href={c.website_url} target="_blank" rel="noopener noreferrer nofollow">{c.website_url}</a></p>}
        </Section>
      </div>

      <Section title="Diagnóstico: oportunidades observadas" id="diagnostico">
        {d.opps.length === 0 ? <Empty>Nenhuma oportunidade documentada.</Empty> : (
          <div className="space-y-3">
            {d.opps.map((o) => (
              <article key={o.id} className={`rounded-lg border border-line p-3 ${o.status !== "open" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2"><Badge t="accent">{o.type}</Badge><Badge>{o.tier}</Badge><Badge>{VERIF[o.verification]}</Badge>{o.status !== "open" && <Badge>{o.status === "dismissed" ? "descartada" : "já não observada"}</Badge>}</div>
                <dl className="mt-2 grid gap-1 text-sm md:grid-cols-3">
                  <div><dt className="font-semibold">Problema observado</dt><dd>{o.observed}</dd></div>
                  <div><dt className="font-semibold">Impacto comercial possível</dt><dd>{o.possible_impact} <span className="text-muted">(possibilidade, não facto)</span></dd></div>
                  <div><dt className="font-semibold">Melhoria sugerida</dt><dd>{o.suggested_improvement}</dd></div>
                </dl>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {o.evidence_ids.map((eid: string) => <a key={eid} href={`#ev-${eid}`}>evidência {formatDateTimePT(evById.get(eid)?.observed_at)}</a>)}
                  <form action={opportunityStatusAction}><input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="opportunityId" value={o.id} />
                    <input type="hidden" name="status" value={o.status === "dismissed" ? "open" : "dismissed"} /><button className="underline">{o.status === "dismissed" ? "Reabrir" : "Descartar (não relevante)"}</button></form>
                  {!dnc && o.status === "open" && <form action={generateDraftsAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="opportunityId" value={o.id} /><button className="underline">Usar nesta abordagem</button></form>}
                </div>
              </article>
            ))}
          </div>
        )}
        {d.analysis && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Última análise do site ({formatDateTimePT(d.analysis.created_at)}) — {d.analysis.outcome}{d.analysis.http_status ? ` HTTP ${d.analysis.http_status}` : ""}</summary>
            <p className="muted mt-1">Ferramentas: {(d.analysis.tools ?? []).map((t: { tool: string; at: string }) => `${t.tool} (${formatDateTimePT(t.at)})`).join("; ")}</p>
            <ul className="mt-1 list-disc pl-5 text-xs">{(d.analysis.pages ?? []).map((p: { url: string; outcome: string; status: number | null; fetchedAt: string }, i: number) => <li key={i}>{p.url} — {p.outcome}{p.status ? ` (${p.status})` : ""} · {formatDateTimePT(p.fetchedAt)}</li>)}</ul>
            {d.analysis.mobile && <div className="mt-2">
              <p className="text-xs">Telemóvel ({d.analysis.mobile.viewport?.width}×{d.analysis.mobile.viewport?.height}): {d.analysis.mobile.error ?? `deslocamento horizontal ${d.analysis.mobile.horizontalOverflowPx ?? 0}px; ligações de menu visíveis ${d.analysis.mobile.menu?.visibleNavLinks ?? "?"}`}. {d.analysis.mobile.note}</p>
              {d.analysis.mobile.screenshotJpegBase64 && <img alt={`Captura do site de ${c.name} em ecrã móvel`} className="mt-2 max-h-96 rounded border border-line" src={`data:image/jpeg;base64,${d.analysis.mobile.screenshotJpegBase64}`} />}
            </div>}
          </details>
        )}
      </Section>

      {d.conflicts.length > 0 && (
        <Section title="Divergências entre fontes" id="conflitos">
          <div className="space-y-3">
            {d.conflicts.map((cf) => (
              <div key={cf.id} className="rounded-lg border border-line p-3 text-sm">
                <p><strong>{cf.field}</strong> · <StatusBadge s={cf.status === "open" ? "conflict" : "confirmed"} /> {cf.status === "resolved" && <>→ {cf.resolved_value} ({cf.resolution_reason})</>}</p>
                <ul className="list-disc pl-5">{cf.candidates.map((x: { value: string | null; source_type: string }, i: number) => <li key={i}>{x.value ?? "—"} <span className="muted">({x.source_type})</span></li>)}</ul>
                {cf.status === "open" && (
                  <form action={resolveConflictAction} className="mt-2 grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="conflictId" value={cf.id} />
                    <div><label className="label" htmlFor={`v-${cf.id}`}>Valor correto</label>
                      <select id={`v-${cf.id}`} name="value" className="input">{cf.candidates.filter((x: { value: string | null }) => x.value).map((x: { value: string }, i: number) => <option key={i}>{x.value}</option>)}</select></div>
                    <div className="md:col-span-2"><label className="label" htmlFor={`r-${cf.id}`}>Motivo</label><input id={`r-${cf.id}`} name="reason" required minLength={3} className="input" /></div>
                    <div className="flex items-end"><button className="btn-ghost">Resolver</button></div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Abordagem (envio sempre manual)" id="abordagem" actions={!dnc && <form action={generateDraftsAction}><input type="hidden" name="id" value={c.id} /><button className="btn">{d.drafts.length ? "Regenerar (mantém editados)" : "Gerar rascunhos"}</button></form>}>
        {dnc ? <Empty>Bloqueado: «não contactar».</Empty> : d.drafts.length === 0 ? <Empty>Sem rascunhos. São gerados a partir de uma observação com fonte; sem observação documentada não é gerada abordagem.</Empty> : (
          <div className="space-y-4">
            {d.drafts.map((dr) => {
              const problems = validateDraftText(dr.body, { loggedContacts: d.logged, companyName: c.name, allowedNumbers: DAY_NUMBERS });
              const draft = { channel: dr.channel as DraftChannel, subject: dr.subject, body: dr.body, evidenceIds: dr.evidence_ids };
              const links = [
                whatsapp && dr.channel === "curta" ? ["Abrir WhatsApp", channelLink("whatsapp", whatsapp.value, draft)] : null,
                insta && dr.channel === "curta" ? ["Abrir perfil", channelLink(insta.kind, insta.value, draft)] : null,
                email && dr.channel !== "curta" ? ["Abrir email", channelLink("email", email.value, draft)] : null,
              ].filter((x): x is [string, string] => !!x && !!x[1]);
              return (
                <form key={dr.id} action={saveDraftAction} className="rounded-lg border border-line p-3">
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="channel" value={dr.channel} />
                  <p className="mb-2 font-semibold">{CHANNEL_LABEL[dr.channel]} {dr.edited && <Badge>editado</Badge>} <span className="text-xs text-muted">baseado em: {dr.evidence_ids.map((e: string) => <a key={e} href={`#ev-${e}`} className="mr-1">evidência</a>)}</span></p>
                  {dr.channel !== "curta" && <><label className="label" htmlFor={`s-${dr.id}`}>Assunto</label><input id={`s-${dr.id}`} name="subject" defaultValue={dr.subject ?? ""} className="input mb-2" /></>}
                  <label className="label" htmlFor={`b-${dr.id}`}>Texto</label>
                  <textarea id={`b-${dr.id}`} name="body" defaultValue={dr.body} rows={dr.channel === "curta" ? 4 : 9} className="input" />
                  {dr.edited && problems.length > 0 && <p className="mt-1 text-xs text-warn">Atenção: {problems.join("; ")}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-ghost">Guardar edição</button>
                    <CopyButton text={dr.channel === "curta" ? dr.body : `${dr.subject ?? ""}\n\n${dr.body}`} />
                    {links.map(([l, href]) => <a key={l} href={href} target="_blank" rel="noopener noreferrer" className="btn-ghost no-underline">{l}</a>)}
                  </div>
                </form>
              );
            })}
            <p className="muted">Os botões apenas copiam o texto ou abrem o canal; nada é enviado automaticamente. Depois de enviar, registe o contacto abaixo.</p>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Registar contacto feito" id="registar">
          {dnc ? <Empty>Bloqueado: «não contactar».</Empty> : (
            <form action={logContactAction} className="space-y-2">
              <input type="hidden" name="id" value={c.id} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label" htmlFor="channel">Canal</label><select id="channel" name="channel" className="input">{["whatsapp", "instagram", "email", "telefone", "presencial", "outro"].map((x) => <option key={x}>{x}</option>)}</select></div>
                <div><label className="label" htmlFor="occurredAt">Quando</label><input id="occurredAt" name="occurredAt" type="datetime-local" className="input" /></div>
              </div>
              <div><label className="label" htmlFor="summary">Resumo</label><textarea id="summary" name="summary" required rows={2} className="input" /></div>
              <label className="flex gap-2 text-sm"><input type="checkbox" name="confirmed" required /> Confirmo que enviei/fiz este contacto manualmente.</label>
              <ConfirmSubmit message="Confirmar o registo de contacto feito?">Registar contacto</ConfirmSubmit>
            </form>
          )}
        </Section>

        <Section title="Tarefas de acompanhamento" id="tarefas">
          <form action={createTaskAction} className="mb-3 grid gap-2 md:grid-cols-4">
            <input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="from" value={`/leads/${c.id}`} />
            <div className="md:col-span-2"><label className="label" htmlFor="title">Tarefa</label><input id="title" name="title" required className="input" defaultValue="Enviar acompanhamento" /></div>
            <div><label className="label" htmlFor="dueDate">Data (Lisboa)</label><input id="dueDate" name="dueDate" type="date" required defaultValue={todayLisbon()} className="input" /></div>
            <div><label className="label" htmlFor="dueTime">Hora</label><input id="dueTime" name="dueTime" type="time" className="input" /></div>
            <div className="md:col-span-4"><button className="btn-ghost">Criar tarefa</button></div>
          </form>
          {d.tasks.length === 0 ? <Empty>Sem tarefas.</Empty> : (
            <ul className="divide-y divide-line text-sm">{d.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5">
                <form action={toggleTaskAction}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="from" value={`/leads/${c.id}`} /><button className="btn-ghost" aria-label={t.done_at ? "Reabrir" : "Concluir"}>{t.done_at ? "↺" : "✓"}</button></form>
                <span className={t.done_at ? "line-through text-muted" : ""}>{String(t.due_date)} {t.due_time?.slice(0, 5)} — {t.title}</span>
              </li>))}</ul>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Notas e histórico" id="historico">
          <form action={addNoteAction} className="mb-3 space-y-2"><input type="hidden" name="id" value={c.id} />
            <label className="label" htmlFor="body">Nova nota</label><textarea id="body" name="body" rows={2} required className="input" /><button className="btn-ghost">Guardar nota</button></form>
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">{d.activities.map((a) => (
            <li key={a.id} className="border-l-2 border-line pl-2"><span className="text-xs text-muted">{formatDateTimePT(a.occurred_at)} · {a.type}{a.channel ? ` · ${a.type === "stage_change" ? stageLabel(a.channel) : a.channel}` : ""}</span><div className="whitespace-pre-wrap">{a.body}</div></li>
          ))}</ul>
        </Section>

        <Section title="Correção manual e revisão de qualidade" id="correcao">
          <form action={overrideAction} className="grid gap-2 md:grid-cols-3">
            <input type="hidden" name="id" value={c.id} />
            <div><label className="label" htmlFor="field">Campo</label><select id="field" name="field" className="input">
              <option value="priority">Prioridade</option><option value="qualification_status">Qualificação</option><option value="niche">Nicho</option>
              <option value="website_status">Estado do site</option><option value="identity_status">Identidade</option><option value="location_status">Localização</option></select></div>
            <div><label className="label" htmlFor="value">Novo valor</label><input id="value" name="value" list="override-values" required className="input" /></div>
            <datalist id="override-values">{["alta", "media", "baixa", "qualified", "review", "discarded", "confirmed", "inferred", "unverified", "not_located", "outside_region", ...NICHES.map((n) => n.key)].map((v) => <option key={v} value={v} />)}</datalist>
            <div><label className="label" htmlFor="reason">Motivo</label><input id="reason" name="reason" required minLength={3} className="input" /></div>
            <div className="md:col-span-3"><button className="btn-ghost">Registar correção</button></div>
          </form>
          {d.overrides.length > 0 && <ul className="mt-2 text-xs">{d.overrides.map((o) => <li key={o.id}>{formatDateTimePT(o.created_at)} · {o.field}: {o.old_value ?? "—"} → {o.new_value} · {o.reason}{o.active ? "" : " (substituída)"}</li>)}</ul>}
          <hr className="my-4 border-line" />
          <form action={qualityReviewAction} className="space-y-2">
            <input type="hidden" name="id" value={c.id} />
            <fieldset><legend className="label">Este lead era adequado?</legend>
              <label className="mr-4"><input type="radio" name="adequate" value="yes" defaultChecked={d.review?.adequate === true} required /> Sim</label>
              <label><input type="radio" name="adequate" value="no" defaultChecked={d.review?.adequate === false} /> Não</label></fieldset>
            <div><label className="label" htmlFor="discardReason">Motivo de descarte</label><input id="discardReason" name="discardReason" defaultValue={d.review?.discard_reason ?? ""} className="input" placeholder="ex.: já tem site novo, fora do perfil" /></div>
            <div><label className="label" htmlFor="searchError">Erro de pesquisa</label><input id="searchError" name="searchError" defaultValue={d.review?.search_error ?? ""} className="input" placeholder="ex.: empresa errada, homónimo, site mal identificado" /></div>
            <button className="btn-ghost">Guardar revisão</button>
            {d.review && <p className="text-xs text-muted">Revisto em {formatDateTimePT(d.review.reviewed_at)}</p>}
          </form>
        </Section>
      </div>

      <Section title={`Evidências (${d.evidences.length})`} id="evidencias">
        <div className="overflow-x-auto">
          <table className="table text-xs"><thead><tr><th>Campo</th><th>Valor</th><th>Estado</th><th>Fonte</th><th>Método</th><th>Consulta</th></tr></thead><tbody>
            {d.evidences.map((e) => (
              <tr key={e.id} id={`ev-${e.id}`} className={e.superseded_at ? "opacity-50" : ""}>
                <td>{e.field}</td><td className="max-w-xs break-words">{e.value ?? (e.details?.purged_at ? "(removido por prazo de retenção)" : "—")}</td><td><StatusBadge s={e.status} /></td>
                <td>{e.source_type}{e.source_url && <> · <a href={e.source_url} target="_blank" rel="noopener noreferrer nofollow">abrir</a></>}</td>
                <td className="max-w-md">{e.method}{e.details?.checked && <ul className="list-disc pl-4">{e.details.checked.map((x: { url: string; result: string }, i: number) => <li key={i}>{x.url}: {x.result}</li>)}</ul>}</td>
                <td className="whitespace-nowrap">{formatDateTimePT(e.observed_at)}{e.expires_at && <div className="text-muted">expira {formatDateTimePT(e.expires_at)}</div>}{e.superseded_at && <div className="text-muted">substituída</div>}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </Section>
    </>
  );
}
