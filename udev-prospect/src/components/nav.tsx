import Link from "next/link";

const items = [
  ["/", "Painel"], ["/pesquisas/nova", "Nova pesquisa"], ["/pesquisas", "Pesquisas"], ["/leads", "Leads"],
  ["/pipeline", "Pipeline"], ["/tarefas", "Tarefas"], ["/configuracoes", "Configurações"],
] as const;

export function Nav({ email, devBypass }: { email: string | null; devBypass: boolean }) {
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink no-underline">
          <span className="text-accent-soft">UDEV</span> Prospect
        </Link>
        <nav aria-label="Principal" className="flex flex-wrap gap-1">
          {items.map(([href, l]) => (
            <Link key={href} href={href} className="rounded-md px-2.5 py-1.5 text-sm text-ink no-underline hover:bg-panel-2">{l}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          {devBypass && <span className="rounded border border-warn/50 px-2 py-0.5 text-warn">modo local de desenvolvimento</span>}
          <span>{email}</span>
          {!devBypass && <form action="/auth/signout" method="post"><button className="underline">Sair</button></form>}
        </div>
      </div>
    </header>
  );
}
