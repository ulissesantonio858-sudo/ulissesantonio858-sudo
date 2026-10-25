import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC = ["/login", "/api/health"];

// Verificação otimista: sem sessão → /login. A verificação real (assinatura, utilizador) é feita
// em cada página/ação (src/lib/auth.ts) e pelas políticas RLS na base de dados.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC.some((p) => path.startsWith(p))) return NextResponse.next();
  if (request.cookies.get("udev_session")) return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = process.env.AUTH_MODE === "supabase" || (process.env.AUTH_MODE !== "local" && url && key);
  if (!supabase || !url || !key) return NextResponse.redirect(new URL("/login", request.url));
  let response = NextResponse.next({ request });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
