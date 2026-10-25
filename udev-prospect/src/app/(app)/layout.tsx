import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";

// Conteúdo privado por utilizador: nunca pré-renderizar.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent-strong focus:px-3 focus:py-2 focus:text-white">Saltar para o conteúdo</a>
      <Nav email={user.email} demo={user.demo} />
      <main id="conteudo" className="mx-auto max-w-7xl space-y-6 px-4 py-6">{children}</main>
    </>
  );
}
