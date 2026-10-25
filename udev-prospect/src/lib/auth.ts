import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { DEMO_USER_ID, SESSION_COOKIE, sessionSecret, verifySession } from "./session";

export type AuthMode = "local" | "supabase";
export interface AppUser { id: string; email: string | null; demo: boolean; mode: AuthMode }

export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** "local" (login com APP_LOGIN_EMAIL/APP_PASSWORD, para o seu computador) ou "supabase" (alojamento com Supabase Auth). */
export function authMode(): AuthMode {
  if (process.env.AUTH_MODE === "supabase") return "supabase";
  if (process.env.AUTH_MODE === "local") return "local";
  return supabaseConfigured() ? "supabase" : "local";
}

export function localLoginConfigured() {
  return !!process.env.APP_LOGIN_EMAIL && (process.env.APP_PASSWORD ?? "").length >= 10;
}

export function demoEnabled() {
  return process.env.DEMO_ENABLED !== "false";
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* chamada a partir de Server Component */ }
      },
    },
  });
}

function allowed(email: string | null | undefined): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length === 0 || (!!email && list.includes(email.toLowerCase()));
}

export async function getUser(): Promise<AppUser | null> {
  const store = await cookies();
  // A sessão de demonstração é sempre local e isolada pelo utilizador DEMO (RLS), em qualquer modo.
  const local = verifySession(store.get(SESSION_COOKIE)?.value, await sessionSecret());
  if (local?.demo && local.sub === DEMO_USER_ID && demoEnabled()) return { id: DEMO_USER_ID, email: "demonstração", demo: true, mode: authMode() };
  if (authMode() === "local") {
    if (!local || local.demo || !localLoginConfigured()) return null;
    if (local.email.toLowerCase() !== process.env.APP_LOGIN_EMAIL!.trim().toLowerCase()) return null;
    return { id: local.sub, email: local.email, demo: false, mode: "local" };
  }
  if (!supabaseConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user || !allowed(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email ?? null, demo: false, mode: "supabase" };
}

export async function requireUser(): Promise<AppUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

/** Utilizador real (bloqueia ações com custos ou efeitos externos no modo de demonstração). */
export async function requireRealUser(): Promise<AppUser> {
  const u = await requireUser();
  if (u.demo) throw new Error("Modo de demonstração: pesquisas e verificações reais estão desativadas. Entre com a sua conta.");
  return u;
}
