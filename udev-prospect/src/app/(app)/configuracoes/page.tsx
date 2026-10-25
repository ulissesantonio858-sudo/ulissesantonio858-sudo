import { requireUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { NICHES } from "@/lib/domain/niches";
import { formatDateTimePT } from "@/lib/domain/time";
import { integrationStatus } from "@/lib/providers/registry";
import { getSettings } from "@/lib/settings";
import { Flash } from "@/components/flash";
import { Badge, Section } from "@/components/ui";
import { addCompanyAction, importCsvAction, saveRubricAction, saveSettingsAction } from "../../actions";

function Num({ name, label, value, max = 40 }: { name: string; label: string; value: number; max?: number }) {
  return <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type="number" min={0} max={max} defaultValue={value} className="input" /></div>;
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { s, usage, rubrics } = await withUser(user.id, async (db) => ({
    s: await getSettings(db),
    usage: (await db.query("select provider, requests, last_remaining from api_usage where day = (now() at time zone 'Europe/Lisbon')::date")).rows,
    rubrics: (await db.query("select version, notes, created_at from scoring_rubrics order by version desc limit 10")).rows,
  }));
  const r = s.rubric;
  return (
    <>
      <h1 className="h1">Configurações</h1>
      <Flash sp={sp} />

      <Section title="Integrações" id="integracoes">
        <p className="muted mb-2">As chaves ficam apenas em variáveis de ambiente no servidor; esta página nunca as mostra. Sem uma integração, a funcionalidade correspondente fica indisponível — nunca é substituída por dados inventados.</p>
        <table className="table"><thead><tr><th>Integração</th><th>Estado</th><th>Função</th><th>Variável</th><th>Notas</th></tr></thead><tbody>
          {integrationStatus().map((i) => (
            <tr key={i.id}><td>{i.label}</td><td>{i.configured ? <Badge t="ok">configurado</Badge> : <Badge t="warn">não configurado</Badge>}</td><td>{i.purpose}</td><td><code className="text-xs">{i.envVar}</code></td><td className="text-xs">{i.notes}</td></tr>
          ))}
        </tbody></table>
      </Section>

      <Section title="Limites, abordagem e retenção" id="limites">
        <form action={saveSettingsAction} className="grid gap-3 md:grid-cols-4">
          {Object.entries(s.limits).map(([k, v]) => {
            const u = usage.find((x) => x.provider === k);
            return <div key={k}><label className="label" htmlFor={`limit_${k}`}>Pedidos/dia: {k}</label><input id={`limit_${k}`} name={`limit_${k}`} type="number" min={0} defaultValue={v} className="input" />
              <p className="text-xs text-muted">Hoje: {u?.requests ?? 0} usados{u?.last_remaining ? ` · fornecedor reporta: ${u.last_remaining}` : ""}</p></div>;
          })}
          <div><label className="label" htmlFor="followups">Acompanhamentos (0–2)</label><input id="followups" name="followups" type="number" min={0} max={2} defaultValue={s.outreach.followups} className="input" /></div>
          <div><label className="label" htmlFor="senderName">Assinatura</label><input id="senderName" name="senderName" defaultValue={s.outreach.senderName} className="input" /></div>
          <div><label className="label" htmlFor="retentionDays">Retenção de dados Google (dias, ≤30)</label><input id="retentionDays" name="retentionDays" type="number" min={1} max={30} defaultValue={s.retentionDays} className="input" /></div>
          <div className="flex items-end"><button className="btn">Guardar</button></div>
        </form>
        <p className="muted mt-2">Pesquisas recorrentes não existem por defeito: cada pesquisa é iniciada manualmente. O conteúdo do Google Places (exceto place_id) é limpo após o prazo; reverifique para atualizar.</p>
      </Section>

      <Section title={`Rubrica de pontuação (ativa: v${s.rubricVersion})`} id="rubrica">
        <form action={saveRubricAction} className="space-y-4">
          <fieldset className="grid gap-2 md:grid-cols-4"><legend className="font-semibold">Oportunidade observada (máx. 40; usa o nível mais forte)</legend>
            <Num name="o_pr" label="Falha principal reproduzida" value={r.opportunity.principal_reproduced} /><Num name="o_ob" label="Obstáculo contacto/navegação" value={r.opportunity.obstacle} />
            <Num name="o_nl" label="Site não localizado (pesquisa documentada)" value={r.opportunity.not_located} /><Num name="o_ps" label="Falha principal vista 1 vez" value={r.opportunity.principal_single} />
            <Num name="o_mi" label="Problema menor" value={r.opportunity.minor} /><Num name="o_an" label="Agência sem oferta web" value={r.opportunity.agency_no_webdev} />
            <Num name="o_ao" label="Agência já oferece sites" value={r.opportunity.agency_offers_webdev} /></fieldset>
          <fieldset className="grid gap-2 md:grid-cols-4"><legend className="font-semibold">Adequação (máx. 20)</legend>
            <Num name="f_c" label="Nicho confirmado na região" value={r.fit.confirmed_in_region} max={20} /><Num name="f_i" label="Nicho inferido na região" value={r.fit.inferred_in_region} max={20} />
            <Num name="f_o" label="Outro serviço local" value={r.fit.other_local_in_region} max={20} /><Num name="f_u" label="Região por confirmar" value={r.fit.region_unverified} max={20} /></fieldset>
          <fieldset className="grid gap-2 md:grid-cols-5"><legend className="font-semibold">Atividade recente (máx. 20)</legend>
            <Num name="a_rd" label="Recente: até (dias)" value={r.activity.recent_days} max={365} /><Num name="a_r" label="Pontos recente" value={r.activity.recent} max={20} />
            <Num name="a_yd" label="Ano: até (dias)" value={r.activity.year_days} max={730} /><Num name="a_y" label="Pontos no ano" value={r.activity.year} max={20} />
            <Num name="a_w" label="Sinal fraco sem data" value={r.activity.weak_signal} max={20} /></fieldset>
          <fieldset className="grid gap-2 md:grid-cols-3"><legend className="font-semibold">Contacto profissional (máx. 20)</legend>
            <Num name="c_o" label="Fonte oficial/cruzada" value={r.contact.official_confirmed} max={20} /><Num name="c_l" label="Só numa listagem" value={r.contact.listing_only} max={20} />
            <Num name="c_s" label="Só rede social/formulário" value={r.contact.social_or_form_only} max={20} /></fieldset>
          <fieldset className="grid gap-2 md:grid-cols-3"><legend className="font-semibold">Prioridade</legend>
            <Num name="p_h" label="Alta a partir de" value={r.priority.high} max={100} /><Num name="p_m" label="Média a partir de" value={r.priority.medium} max={100} />
            <div><label className="label" htmlFor="notes">Nota da versão</label><input id="notes" name="notes" className="input" /></div></fieldset>
          <button className="btn">Guardar como nova versão</button>
        </form>
        <p className="muted mt-2">Versões: {rubrics.map((x) => `v${x.version} (${formatDateTimePT(x.created_at)}${x.notes ? ` — ${x.notes}` : ""})`).join(" · ")}</p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Importar / exportar CSV" id="csv">
          <form action={importCsvAction} className="space-y-2">
            <label className="label" htmlFor="file">Ficheiro CSV (máx. 2 MB)</label><input id="file" name="file" type="file" accept=".csv,text/csv" required className="input" />
            <p className="text-xs text-muted">Colunas reconhecidas: nome, nicho, morada, localidade, codigo_postal, telefone, email, website, instagram, facebook, notas, place_id, latitude, longitude.
              Reimportar não duplica empresas nem notas e nunca apaga notas. Dados importados ficam «inferidos» até serem verificados.</p>
            <button className="btn">Importar</button>
          </form>
          <p className="mt-3"><a href="/api/export" className="btn-ghost no-underline">Exportar todos os leads (CSV)</a></p>
        </Section>

        <Section title="Adicionar empresa manualmente" id="adicionar">
          <form action={addCompanyAction} className="grid gap-2 md:grid-cols-2">
            <div className="md:col-span-2"><label className="label" htmlFor="name">Nome</label><input id="name" name="name" required className="input" /></div>
            <div><label className="label" htmlFor="niche">Nicho</label><select id="niche" name="niche" className="input"><option value="">—</option>{NICHES.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}</select></div>
            <div><label className="label" htmlFor="locality">Localidade</label><input id="locality" name="locality" className="input" defaultValue="Vila Real" /></div>
            <div><label className="label" htmlFor="address">Morada</label><input id="address" name="address" className="input" /></div>
            <div><label className="label" htmlFor="postcode">Código postal</label><input id="postcode" name="postcode" className="input" placeholder="5000-000" /></div>
            <div><label className="label" htmlFor="phone">Telefone publicado</label><input id="phone" name="phone" className="input" /></div>
            <div><label className="label" htmlFor="website">Website</label><input id="website" name="website" className="input" /></div>
            <div><label className="label" htmlFor="email">Email publicado</label><input id="email" name="email" type="email" className="input" /></div>
            <div><label className="label" htmlFor="emailSource">Onde foi publicado (URL)</label><input id="emailSource" name="emailSource" type="url" className="input" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="notes2">Notas</label><textarea id="notes2" name="notes" rows={2} className="input" /></div>
            <div><button className="btn">Adicionar</button></div>
          </form>
        </Section>
      </div>
    </>
  );
}
