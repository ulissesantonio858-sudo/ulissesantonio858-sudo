import { requireUser } from "@/lib/auth";
import { LOCATION_PRESETS } from "@/lib/domain/geo";
import { NICHES } from "@/lib/domain/niches";
import { OPPORTUNITY_CATEGORIES } from "@/lib/domain/search-params";
import { integrationStatus } from "@/lib/providers/registry";
import { Flash } from "@/components/flash";
import { Notice } from "@/components/ui";
import { createSearchAction } from "../../../actions";

export default async function NewSearch({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const st = Object.fromEntries(integrationStatus().map((i) => [i.id, i]));
  return (
    <>
      <h1 className="h1">Nova pesquisa</h1>
      <Flash sp={sp} />
      <p className="muted max-w-3xl">O sistema pesquisa nas fontes configuradas, elimina duplicados, confirma identidade e localização, verifica canais públicos e analisa os sites.
        O número de leads qualificados depende do que for verificado — não há quantidade garantida.</p>
      {!st.brave.configured && <Notice>Pesquisa web (Brave) não configurada: empresas sem site na listagem ficam «presença digital não verificada», não «site não localizado».</Notice>}
      <form action={createSearchAction} className="card grid gap-5 md:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="h2 mb-2">Localização</legend>
          <div>
            <label htmlFor="locationKey" className="label">Localidade</label>
            <select id="locationKey" name="locationKey" className="input" defaultValue="vila-real">
              {LOCATION_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              <option value="custom">Outra localidade…</option>
            </select>
            <p className="muted mt-1">Vila Real (distrito de Vila Real) usa centro fixo, códigos postais 50xx e exclui «Vila Real de Santo António».</p>
          </div>
          <div><label htmlFor="locality" className="label">Outra localidade (se escolheu «Outra»)</label><input id="locality" name="locality" className="input" placeholder="ex.: Chaves" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label htmlFor="lat" className="label">Latitude (opcional)</label><input id="lat" name="lat" className="input" inputMode="decimal" /></div>
            <div><label htmlFor="lng" className="label">Longitude (opcional)</label><input id="lng" name="lng" className="input" inputMode="decimal" /></div>
          </div>
          <p className="muted">Sem coordenadas, a localidade é resolvida via Google Places (se configurado) e o resultado é mostrado para confirmar.</p>
          <div><label htmlFor="radiusKm" className="label">Raio (km)</label><input id="radiusKm" name="radiusKm" type="number" min={1} max={50} defaultValue={15} className="input" /></div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="h2 mb-2">Alvo</legend>
          <div role="radiogroup" aria-label="Modo" className="space-y-1">
            <label className="flex gap-2"><input type="radio" name="mode" value="clients" defaultChecked /> Clientes finais (negócios locais)</label>
            <label className="flex gap-2"><input type="radio" name="mode" value="agencies" /> Agências de marketing/redes sociais (parceria)</label>
          </div>
          <div>
            <span className="label">Nichos (modo clientes)</span>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {NICHES.filter((n) => !n.agency).map((n) => (
                <label key={n.key} className="flex gap-2 text-sm"><input type="checkbox" name="niches" value={n.key} defaultChecked={n.key !== "servicos_locais"} /> {n.label}</label>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Tipos de oportunidade a mostrar</span>
            {Object.entries(OPPORTUNITY_CATEGORIES).map(([k, v]) => (
              <label key={k} className="flex gap-2 text-sm"><input type="checkbox" name="opportunityTypes" value={k} defaultChecked={k !== "minor"} /> {v.label}</label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="h2 mb-2">Fontes e limites</legend>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="providers" value="google_places" defaultChecked={st.google_places.configured} disabled={!st.google_places.configured} />
            Google Places {st.google_places.configured ? "" : "(não configurado)"}</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="providers" value="osm" defaultChecked={st.osm.configured} disabled={!st.osm.configured} />
            OpenStreetMap (sem chave; cobertura variável)</label>
          <div><label htmlFor="maxCandidates" className="label">Máximo de candidatos a analisar</label><input id="maxCandidates" name="maxCandidates" type="number" min={1} max={200} defaultValue={30} className="input" /></div>
          <p className="muted">Cada candidato pode consumir pedidos de pesquisa web e análise de site. Os limites diários estão nas configurações.</p>
        </fieldset>
        <div className="flex items-end md:col-span-2"><button className="btn">Iniciar pesquisa</button></div>
      </form>
    </>
  );
}
