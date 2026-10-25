import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Atualiza a sessão Supabase e redireciona visitantes sem sessão para /login (verificação otimista;
// a autorização real é feita em cada página/ação e pelas políticas RLS).
export async function proxy(request: NextRequest) {
  const devBypass = process.env.DEV_AUTH_USER_ID && process.env.NODE_ENV !== "production";
  if (devBypass) return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  if (!url || !key) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
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
  if (!data.user && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
