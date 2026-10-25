import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export interface AppUser { id: string; email: string | null; devBypass: boolean }

export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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

/**
 * Utilizador autenticado. Modo de desenvolvimento local (DEV_AUTH_USER_ID) só funciona fora de produção
 * e serve para correr a app contra um Postgres local sem Supabase.
 */
export async function getUser(): Promise<AppUser | null> {
  const dev = process.env.DEV_AUTH_USER_ID;
  if (dev && process.env.NODE_ENV !== "production") return { id: dev, email: "dev@local", devBypass: true };
  if (!supabaseConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user || !allowed(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email ?? null, devBypass: false };
}

export async function requireUser(): Promise<AppUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}
