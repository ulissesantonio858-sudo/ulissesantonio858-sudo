"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { authMode, demoEnabled, localLoginConfigured, requireUser, supabaseConfigured, supabaseServer } from "@/lib/auth";
import { ensureDemoData } from "@/lib/demo";
import { credentialsMatch, DEMO_USER_ID, localUserId, SESSION_COOKIE, sessionSecret, signSession } from "@/lib/session";
import { withUser } from "@/lib/db";
import { addOverride, generateDrafts, importCsv, logContact, resolveConflict, saveDraft, saveQualityReview, setStage, STAGES, type Stage, rescore } from "@/lib/crm";
import { presetByKey } from "@/lib/domain/geo";
import { NICHES } from "@/lib/domain/niches";
import { RubricSchema } from "@/lib/domain/rubric";
import { SearchParamsSchema } from "@/lib/domain/search-params";
import { enqueueJob } from "@/lib/pipeline/jobs";
import { insertEvidences, logActivity, upsertCompany, upsertContacts } from "@/lib/pipeline/repo";
import { normalizeEmail, normalizePhonePT } from "@/lib/domain/normalize";
import { geocodeWithPlaces } from "@/lib/providers/google-places";
import { checkIntegrations } from "@/lib/providers/check";
import { dbUsageGuard, getSettings } from "@/lib/settings";
import type { ContactDraft, EvidenceDraft } from "@/lib/analysis/types";

const uuid = z.string().uuid();
const back = (path: string, kind: "erro" | "ok", msg: string) => `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`;

const DEMO_MSG = "Modo de demonstração: pesquisas, verificações e importações reais estão desativadas. Entre com a sua conta para trabalhar com dados reais.";
function noDemo(user: { demo: boolean }, path: string) {
  if (user.demo) redirect(back(path, "erro", DEMO_MSG));
}

async function run(path: string, fn: () => Promise<string | void>): Promise<never> {
  let target: string;
  try {
    const msg = await fn();
    target = back(path, "ok", msg || "Guardado.");
  } catch (e) {
    target = back(path, "erro", e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : (e as Error).message);
  }
  revalidatePath(path.split("?")[0]);
  redirect(target);
}

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (authMode() === "local") {
    if (!localLoginConfigured()) redirect("/login?erro=" + encodeURIComponent("Defina APP_LOGIN_EMAIL e APP_PASSWORD (mín. 10 caracteres) no ficheiro .env e reinicie."));
    if (!credentialsMatch(email, password, process.env.APP_LOGIN_EMAIL!, process.env.APP_PASSWORD!)) {
      await new Promise((r) => setTimeout(r, 800)); // abranda tentativas repetidas
      redirect("/login?erro=" + encodeURIComponent("Email ou palavra-passe incorretos."));
    }
    await setSession({ sub: localUserId(process.env.APP_LOGIN_EMAIL!), email: process.env.APP_LOGIN_EMAIL!.trim(), demo: false });
    redirect("/");
  }
  if (!supabaseConfigured()) redirect("/login?erro=" + encodeURIComponent("Supabase não configurado"));
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?erro=" + encodeURIComponent("Credenciais inválidas ou utilizador sem acesso."));
  redirect("/");
}

export async function enterDemo() {
  if (!demoEnabled()) redirect("/login?erro=" + encodeURIComponent("Modo de demonstração desativado (DEMO_ENABLED=false)."));
  await ensureDemoData();
  await setSession({ sub: DEMO_USER_ID, email: "demonstração", demo: true });
  redirect("/");
}

async function setSession(p: { sub: string; email: string; demo: boolean }) {
  const store = await cookies();
  const maxAge = p.demo ? 4 * 3600 : 30 * 86400;
  store.set(SESSION_COOKIE, signSession({ ...p, exp: Date.now() + maxAge * 1000 }, await sessionSecret()), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge, secure: process.env.COOKIE_SECURE === "true",
  });
}

// ---------------------------------------------------------------------------
// Pesquisas
// ---------------------------------------------------------------------------
export async function createSearchAction(formData: FormData) {
  const user = await requireUser();
  noDemo(user, "/pesquisas/nova");
  let newId = "";
  try {
    const presetKey = String(formData.get("locationKey") ?? "");
    const preset = presetByKey(presetKey);
    const mode = formData.get("mode") === "agencies" ? "agencies" : "clients";
    let locality = String(formData.get("locality") ?? "").trim();
    let center: { lat: number; lng: number } | null = null;
    let centerLabel = "";
    if (preset) { locality = preset.locality; center = preset.center; centerLabel = preset.label; }
    else {
      const lat = Number(String(formData.get("lat") ?? "").replace(",", "."));
      const lng = Number(String(formData.get("lng") ?? "").replace(",", "."));
      if (String(formData.get("lat") ?? "").trim() && Number.isFinite(lat) && Number.isFinite(lng)) { center = { lat, lng }; centerLabel = `${locality} (coordenadas indicadas)`; }
      else {
        const settings = await withUser(user.id, (db) => getSettings(db));
        const g = await geocodeWithPlaces(`${locality}, Portugal`, dbUsageGuard(user.id, settings.limits)).catch((e) => { throw new Error(`Não foi possível localizar «${locality}»: ${(e as Error).message}. Indique latitude e longitude.`); });
        if (!g) throw new Error(`Localidade «${locality}» não encontrada. Indique latitude e longitude.`);
        center = { lat: g.lat, lng: g.lng };
        centerLabel = `${g.formattedAddress} (resolvido via Google Places — confirme)`;
      }
    }
    const params = SearchParamsSchema.parse({
      locationKey: preset?.key ?? null, locality, center, centerLabel,
      postcodePrefixes: preset?.postcodePrefixes ?? [], excludeTerms: preset?.excludeTerms ?? [],
      radiusKm: Number(formData.get("radiusKm")),
      niches: mode === "agencies" ? ["agencia_marketing"] : formData.getAll("niches").map(String).filter((n) => n !== "agencia_marketing"),
      opportunityTypes: mode === "agencies" ? ["site_errors", "contact_path", "not_located", "minor"] : formData.getAll("opportunityTypes").map(String),
      mode, maxCandidates: Number(formData.get("maxCandidates")), providers: formData.getAll("providers").map(String),
    });
    newId = await withUser(user.id, async (db) => {
      const id = (await db.query("insert into searches (params) values ($1) returning id", [JSON.stringify(params)])).rows[0].id;
      await enqueueJob(db, "search", id);
      return id;
    });
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : (e as Error).message;
    redirect(back("/pesquisas/nova", "erro", msg));
  }
  redirect(`/pesquisas/${newId}`);
}

export async function cancelSearch(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  return run(`/pesquisas/${id}`, async () => {
    await withUser(user.id, async (db) => {
      await db.query("update searches set status = 'cancel_requested' where id = $1 and status in ('queued','running')", [id]);
      await db.query("update jobs set status = 'cancelled' where ref_id = $1 and type = 'search' and status = 'queued'", [id]);
      await db.query("update searches set status = 'cancelled', finished_at = now() where id = $1 and status = 'cancel_requested' and not exists (select 1 from jobs where ref_id = $1 and status = 'running')", [id]);
    });
    return "Cancelamento pedido. O trabalho já feito é mantido.";
  });
}

export async function resumeSearch(formData: FormData) {
  const user = await requireUser();
  noDemo(user, "/pesquisas");
  const id = uuid.parse(formData.get("id"));
  return run(`/pesquisas/${id}`, async () => {
    await withUser(user.id, async (db) => {
      const r = await db.query("update searches set status = 'queued', finished_at = null where id = $1 and status in ('cancelled','failed') returning id", [id]);
      if (!r.rowCount) throw new Error("Só é possível retomar pesquisas canceladas ou com falha.");
      await db.query("update search_candidates set status = 'pending', attempts = 0 where search_id = $1 and status = 'failed'", [id]);
      await enqueueJob(db, "search", id);
    });
    return "Pesquisa retomada: continua a partir dos candidatos pendentes, sem duplicar.";
  });
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export async function reverifyAction(formData: FormData) {
  const user = await requireUser();
  noDemo(user, "/leads");
  const id = uuid.parse(formData.get("id"));
  return run(`/leads/${id}`, async () => {
    await withUser(user.id, async (db) => {
      await db.query("update companies set pipeline_stage = case when pipeline_stage = 'novo' then 'em_verificacao' else pipeline_stage end where id = $1", [id]);
      await enqueueJob(db, "reverify", id);
    });
    return "Reverificação em fila (o worker tem de estar a correr).";
  });
}

export async function setStageAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  const stage = z.enum(STAGES.map(([k]) => k) as [Stage, ...Stage[]]).parse(formData.get("stage"));
  const from = String(formData.get("from") ?? `/leads/${id}`);
  return run(from.startsWith("/") ? from : `/leads/${id}`, async () => {
    await withUser(user.id, (db) => setStage(db, id, stage, String(formData.get("reason") ?? "") || undefined));
    return "Etapa atualizada.";
  });
}

export async function logContactAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  return run(`/leads/${id}`, async () => {
    const occurred = String(formData.get("occurredAt") ?? "");
    await withUser(user.id, (db) => logContact(db, id, {
      channel: z.enum(["whatsapp", "instagram", "email", "telefone", "presencial", "outro"]).parse(formData.get("channel")),
      summary: z.string().trim().min(3, "Descreva o contacto").max(2000).parse(formData.get("summary")),
      occurredAt: occurred ? new Date(occurred).toISOString() : undefined,
      confirmed: formData.get("confirmed") === "on",
    }));
    return "Contacto registado.";
  });
}

export async function addNoteAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  return run(`/leads/${id}`, async () => {
    const body = z.string().trim().min(1).max(5000).parse(formData.get("body"));
    await withUser(user.id, (db) => logActivity(db, id, "note", body));
    return "Nota guardada.";
  });
}

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const companyId = formData.get("companyId") ? uuid.parse(formData.get("companyId")) : null;
  const from = String(formData.get("from") ?? "/tarefas");
  return run(from.startsWith("/") ? from : "/tarefas", async () => {
    const title = z.string().trim().min(1).max(300).parse(formData.get("title"));
    const due = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida").parse(formData.get("dueDate"));
    const time = String(formData.get("dueTime") ?? "") || null;
    if (time && !/^\d{2}:\d{2}$/.test(time)) throw new Error("hora inválida");
    await withUser(user.id, (db) => db.query("insert into tasks (company_id, title, due_date, due_time) values ($1,$2,$3,$4)", [companyId, title, due, time]));
    return "Tarefa criada (fuso Europe/Lisbon).";
  });
}

export async function toggleTaskAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  const from = String(formData.get("from") ?? "/tarefas");
  return run(from.startsWith("/") ? from : "/tarefas", async () => {
    await withUser(user.id, (db) => db.query("update tasks set done_at = case when done_at is null then now() else null end where id = $1", [id]));
    return "Tarefa atualizada.";
  });
}

export async function generateDraftsAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  const opp = formData.get("opportunityId") ? uuid.parse(formData.get("opportunityId")) : undefined;
  return run(`/leads/${id}`, async () => {
    await withUser(user.id, (db) => generateDrafts(db, id, { opportunityId: opp }));
    return "Rascunhos gerados. Reveja e edite antes de enviar manualmente.";
  });
}

export async function saveDraftAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  return run(`/leads/${id}`, async () => {
    const channel = z.enum(["curta", "email", "followup_1", "followup_2"]).parse(formData.get("channel"));
    const body = z.string().trim().min(1).max(5000).parse(formData.get("body"));
    await withUser(user.id, (db) => saveDraft(db, id, channel, String(formData.get("subject") ?? "") || null, body));
    return "Rascunho guardado.";
  });
}

export async function overrideAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  return run(`/leads/${id}`, async () => {
    const field = z.enum(["priority", "qualification_status", "niche", "website_status", "identity_status", "location_status"]).parse(formData.get("field"));
    const allowed: Record<string, string[]> = {
      priority: ["alta", "media", "baixa"], qualification_status: ["qualified", "review", "discarded"], niche: NICHES.map((n) => n.key),
      website_status: ["confirmed", "not_located", "not_verified", "unreachable", "blocked"], identity_status: ["confirmed", "inferred", "unverified"],
      location_status: ["confirmed", "inferred", "unverified", "outside_region"],
    };
    const value = z.string().parse(formData.get("value"));
    if (!allowed[field].includes(value)) throw new Error("valor inválido para o campo");
    await withUser(user.id, (db) => addOverride(db, id, field, value, String(formData.get("reason") ?? "")));
    return "Correção registada no histórico.";
  });
}

export async function resolveConflictAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("companyId"));
  return run(`/leads/${id}`, async () => {
    const reason = z.string().trim().min(3, "Indique o motivo").parse(formData.get("reason"));
    await withUser(user.id, (db) => resolveConflict(db, uuid.parse(formData.get("conflictId")), z.string().min(1).parse(formData.get("value")), reason));
    return "Divergência resolvida.";
  });
}

export async function qualityReviewAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("id"));
  return run(`/leads/${id}`, async () => {
    await withUser(user.id, (db) => saveQualityReview(db, id, { adequate: formData.get("adequate") === "yes",
      discardReason: String(formData.get("discardReason") ?? "").slice(0, 300), searchError: String(formData.get("searchError") ?? "").slice(0, 300) }));
    return "Revisão de qualidade guardada.";
  });
}

export async function opportunityStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = uuid.parse(formData.get("companyId"));
  return run(`/leads/${id}`, async () => {
    const status = z.enum(["open", "dismissed"]).parse(formData.get("status"));
    await withUser(user.id, async (db) => {
      await db.query("update opportunities set status = $2 where id = $1", [uuid.parse(formData.get("opportunityId")), status]);
      await logActivity(db, id, "override", `Oportunidade ${status === "dismissed" ? "descartada manualmente" : "reaberta"}.`);
      await rescore(db, id);
    });
    return "Oportunidade atualizada e pontuação recalculada.";
  });
}

export async function addCompanyAction(formData: FormData) {
  const user = await requireUser();
  let newId = "";
  try {
    const name = z.string().trim().min(2).max(200).parse(formData.get("name"));
    const niche = String(formData.get("niche") ?? "") || null;
    newId = await withUser(user.id, async (db) => {
      const { company } = await upsertCompany(db, { name, locality: String(formData.get("locality") ?? "") || null, address: String(formData.get("address") ?? "") || null,
        postcode: String(formData.get("postcode") ?? "") || null, phone: String(formData.get("phone") ?? "") || null, website: String(formData.get("website") ?? "") || null,
        niche, nicheStatus: niche ? "inferred" : "unknown", isAgency: niche === "agencia_marketing" }, "cadastro manual");
      const now = new Date().toISOString();
      const evs: EvidenceDraft[] = [];
      const contacts: ContactDraft[] = [];
      const phone = normalizePhonePT(String(formData.get("phone") ?? ""));
      if (phone) { evs.push({ key: "p", field: "phone", value: phone, sourceType: "manual", sourceUrl: null, method: "introduzido manualmente (não verificado)", status: "inferred", observedAt: now }); contacts.push({ kind: "phone", value: phone, valueNorm: phone, status: "inferred", evidenceKey: "p" }); }
      const email = normalizeEmail(String(formData.get("email") ?? ""));
      if (email) { evs.push({ key: "e", field: "email", value: email, sourceType: "manual", sourceUrl: String(formData.get("emailSource") ?? "") || null, method: "introduzido manualmente (não verificado)", status: "inferred", observedAt: now }); contacts.push({ kind: "email", value: email, valueNorm: email, status: "inferred", evidenceKey: "e" }); }
      const map = await insertEvidences(db, company.id, evs, null);
      await upsertContacts(db, company.id, contacts, map);
      const note = String(formData.get("notes") ?? "").trim();
      if (note) await logActivity(db, company.id, "note", note);
      return company.id;
    });
  } catch (e) {
    redirect(back("/configuracoes", "erro", (e as Error).message));
  }
  redirect(`/leads/${newId}?ok=${encodeURIComponent("Empresa registada. Use «Verificar» para recolher evidências.")}`);
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
export async function importCsvAction(formData: FormData) {
  const user = await requireUser();
  noDemo(user, "/configuracoes");
  return run("/configuracoes", async () => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Escolha um ficheiro CSV.");
    if (file.size > 2_000_000) throw new Error("Ficheiro demasiado grande (máx. 2 MB).");
    const s = await withUser(user.id, async (db) => importCsv(db, await file.text(), file.name.slice(0, 100)));
    return `Importação: ${s.rows} linhas · ${s.created} novas · ${s.matched} já existentes (atualizadas sem apagar notas) · ${s.branches} filiais · ${s.notesAdded} notas · ${s.errors.length} erros${s.errors.length ? ` (${s.errors.slice(0, 5).map((e) => `linha ${e.line}: ${e.error}`).join("; ")})` : ""}`;
  });
}

export async function saveSettingsAction(formData: FormData) {
  const user = await requireUser();
  return run("/configuracoes", async () => {
    const lim = (k: string) => z.coerce.number().int().min(0).max(100_000).parse(formData.get(`limit_${k}`));
    const limits = { google_places: lim("google_places"), brave: lim("brave"), anthropic: lim("anthropic"), osm: lim("osm") };
    const outreach = { followups: z.coerce.number().int().min(0).max(2).parse(formData.get("followups")), senderName: z.string().trim().min(1).max(60).parse(formData.get("senderName")) };
    const retention = z.coerce.number().int().min(1).max(30).parse(formData.get("retentionDays"));
    await withUser(user.id, async (db) => {
      await getSettings(db);
      await db.query("update settings set limits = $1, outreach = $2, places_retention_days = $3, updated_at = now() where owner_id = auth.uid()", [JSON.stringify(limits), JSON.stringify(outreach), retention]);
    });
    return "Configurações guardadas.";
  });
}

export async function saveRubricAction(formData: FormData) {
  const user = await requireUser();
  return run("/configuracoes", async () => {
    const n = (k: string) => Number(formData.get(k));
    const cfg = RubricSchema.parse({
      opportunity: { principal_reproduced: n("o_pr"), obstacle: n("o_ob"), not_located: n("o_nl"), principal_single: n("o_ps"), minor: n("o_mi"), agency_no_webdev: n("o_an"), agency_offers_webdev: n("o_ao") },
      fit: { confirmed_in_region: n("f_c"), inferred_in_region: n("f_i"), other_local_in_region: n("f_o"), region_unverified: n("f_u") },
      activity: { recent_days: n("a_rd"), recent: n("a_r"), year_days: n("a_yd"), year: n("a_y"), weak_signal: n("a_w") },
      contact: { official_confirmed: n("c_o"), listing_only: n("c_l"), social_or_form_only: n("c_s") },
      priority: { high: n("p_h"), medium: n("p_m") },
    });
    const version = await withUser(user.id, async (db) => {
      await getSettings(db);
      const v = (await db.query("select coalesce(max(version), 0) + 1 v from scoring_rubrics")).rows[0].v;
      await db.query("insert into scoring_rubrics (version, config, notes) values ($1, $2, $3)", [v, JSON.stringify(cfg), String(formData.get("notes") ?? "").slice(0, 300) || null]);
      await db.query("update settings set active_rubric_version = $1 where owner_id = auth.uid()", [v]);
      return v;
    });
    return `Rubrica v${version} ativa. As pontuações existentes mantêm a versão com que foram calculadas até serem reverificadas.`;
  });
}

export async function testIntegrationsAction() {
  const user = await requireUser();
  noDemo(user, "/configuracoes");
  return run("/configuracoes", async () => {
    const settings = await withUser(user.id, (db) => getSettings(db));
    const results = await checkIntegrations(dbUsageGuard(user.id, settings.limits));
    await withUser(user.id, (db) => db.query("update settings set last_checks = $1 where owner_id = auth.uid()", [JSON.stringify(results)]));
    const bad = results.filter((r) => r.status !== "ok");
    return bad.length ? `Diagnóstico concluído: ${results.length - bad.length} OK, ${bad.length} com problemas ou por configurar (ver tabela).` : "Diagnóstico concluído: todas as integrações responderam.";
  });
}
