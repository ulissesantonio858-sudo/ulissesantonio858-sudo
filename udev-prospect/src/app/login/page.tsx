import { redirect } from "next/navigation";
import { getUser, supabaseConfigured } from "@/lib/auth";
import { signIn } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await getUser()) redirect("/");
  const { erro } = await searchParams;
  const configured = supabaseConfigured();
  return (
    <main className="mx-auto mt-20 max-w-sm px-4">
      <h1 className="h1 mb-1"><span className="text-accent-soft">UDEV</span> Prospect</h1>
      <p className="muted mb-6">Aplicação privada. Acesso apenas a utilizadores autorizados.</p>
      {!configured && (
        <div className="card mb-4 text-sm">
          <p className="font-semibold text-warn">Autenticação não configurada</p>
          <p className="muted mt-1">Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ver README). Para desenvolvimento local sem Supabase existe DEV_AUTH_USER_ID (apenas fora de produção).</p>
        </div>
      )}
      {erro && <p role="alert" className="mb-4 rounded-lg border border-bad/50 bg-bad/10 p-3 text-sm text-bad">{erro}</p>}
      <form action={signIn} className="card space-y-3">
        <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label htmlFor="password" className="label">Palavra-passe</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        <button className="btn w-full justify-center" disabled={!configured}>Entrar</button>
      </form>
    </main>
  );
}
