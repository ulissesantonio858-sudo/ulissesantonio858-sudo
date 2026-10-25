import type { ReactNode } from "react";

const tone = {
  ok: "border-ok/50 bg-ok/10 text-ok",
  warn: "border-warn/50 bg-warn/10 text-warn",
  bad: "border-bad/50 bg-bad/10 text-bad",
  accent: "border-accent/60 bg-accent/15 text-accent-soft",
  neutral: "border-line bg-panel-2 text-muted",
} as const;

export function Badge({ children, t = "neutral", title }: { children: ReactNode; t?: keyof typeof tone; title?: string }) {
  return <span title={title} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${tone[t]}`}>{children}</span>;
}

export function PriorityBadge({ p }: { p: string | null | undefined }) {
  if (!p) return <Badge>sem pontuação</Badge>;
  return <Badge t={p === "alta" ? "ok" : p === "media" ? "warn" : "neutral"}>prioridade {p === "media" ? "média" : p}</Badge>;
}
export function ConfidenceBadge({ c }: { c: string | null | undefined }) {
  if (!c) return null;
  return <Badge t={c === "alto" ? "ok" : c === "medio" ? "warn" : "bad"}>confiança {c === "medio" ? "média" : c === "alto" ? "alta" : "baixa"}</Badge>;
}

export const STATUS_LABEL: Record<string, string> = {
  confirmed: "confirmado", inferred: "inferido", not_found: "não encontrado", unavailable: "indisponível", conflict: "em conflito",
  unverified: "por verificar", not_located: "site não localizado", not_verified: "não verificado", unreachable: "inacessível (inconclusivo)",
  blocked: "bloqueado (não verificado)", outside_region: "fora da região", qualified: "qualificado", review: "para revisão", discarded: "descartado",
  pending: "pendente", operational: "em atividade", closed_temporarily: "fechado temporariamente", closed_permanently: "encerrado", unknown: "desconhecido",
  processing: "a processar", done: "concluído", failed: "falhou", skipped: "ignorado", duplicate: "duplicado",
  queued: "em fila", running: "em curso", cancel_requested: "a cancelar", cancelled: "cancelada", completed: "concluída",
};
export const label = (s: string | null | undefined) => (s ? STATUS_LABEL[s] ?? s : "—");

export function StatusBadge({ s }: { s: string | null | undefined }) {
  const t = s === "confirmed" || s === "qualified" || s === "done" || s === "completed" ? "ok"
    : s === "conflict" || s === "failed" || s === "discarded" || s === "outside_region" || s === "closed_permanently" ? "bad"
      : s === "inferred" || s === "review" || s === "not_located" || s === "running" || s === "queued" ? "warn" : "neutral";
  return <Badge t={t}>{label(s)}</Badge>;
}

export function Section({ title, children, actions, id }: { title: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="h2">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">{children}</p>;
}

export function Notice({ children, t = "warn" }: { children: ReactNode; t?: "warn" | "bad" | "ok" | "accent" }) {
  const c = { warn: "border-warn/40 bg-warn/5", bad: "border-bad/40 bg-bad/5", ok: "border-ok/40 bg-ok/5", accent: "border-accent/40 bg-accent/5" }[t];
  return <div role="status" className={`rounded-lg border p-3 text-sm ${c}`}>{children}</div>;
}
