import { redirect } from "next/navigation";
import { authMode, demoEnabled, getUser, localLoginConfigured, supabaseConfigured } from "@/lib/auth";
import { enterDemo, signIn } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await getUser()) redirect("/");
  const { erro } = await searchParams;
  const mode = authMode();
  const configured = mode === "local" ? localLoginConfigured() : supabaseConfigured();
  return (
    <main className="mx-auto mt-20 max-w-sm px-4">
      <h1 className="h1 mb-1"><span className="text-accent-soft">UDEV</span> Prospect</h1>
      <p className="muted mb-6">Aplicação privada. Acesso apenas a utilizadores autorizados.</p>
      {!configured && (
        <div className="card mb-4 text-sm">
          <p className="font-semibold text-warn">Login não configurado</p>
          <p className="muted mt-1">{mode === "local"
            ? "Defina APP_LOGIN_EMAIL e APP_PASSWORD (mínimo 10 caracteres) no ficheiro .env e reinicie os serviços."
            : "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."}</p>
        </div>
      )}
      {erro && <p role="alert" className="mb-4 rounded-lg border border-bad/50 bg-bad/10 p-3 text-sm text-bad">{erro}</p>}
      <form action={signIn} className="card space-y-3">
        <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label htmlFor="password" className="label">Palavra-passe</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        <button className="btn w-full justify-center" disabled={!configured}>Entrar</button>
        <p className="text-xs text-muted">Modo de autenticação: {mode === "local" ? "local (credenciais do ficheiro .env)" : "Supabase"}</p>
      </form>
      {demoEnabled() && (
        <form action={enterDemo} className="mt-4">
          <button className="btn-ghost w-full justify-center">Ver demonstração (dados fictícios, separados dos reais)</button>
        </form>
      )}
    </main>
  );
}
