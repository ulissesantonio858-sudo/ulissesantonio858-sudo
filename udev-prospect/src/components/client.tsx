"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Atualiza a página periodicamente enquanto um trabalho está em curso. */
export function AutoRefresh({ active, ms = 3000 }: { active: boolean; ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [active, ms, router]);
  return active ? <span className="text-xs text-muted" aria-live="polite">A atualizar automaticamente…</span> : null;
}

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? "Copiado ✓" : label}
    </button>
  );
}

/** Botão de submissão que pede confirmação antes de enviar o formulário. */
export function ConfirmSubmit({ children, message, className = "btn" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
