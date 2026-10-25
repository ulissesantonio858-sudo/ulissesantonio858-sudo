export function Flash({ sp }: { sp: { ok?: string; erro?: string } }) {
  if (sp.erro) return <p role="alert" className="rounded-lg border border-bad/50 bg-bad/10 p-3 text-sm text-bad">{sp.erro}</p>;
  if (sp.ok) return <p role="status" className="rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm text-ok">{sp.ok}</p>;
  return null;
}
