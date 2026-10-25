export const TZ = "Europe/Lisbon";

/** Data civil (AAAA-MM-DD) em Europe/Lisbon. */
export function todayLisbon(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function formatDateTimePT(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatDatePT(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00Z") : new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", { timeZone: TZ, dateStyle: "medium" }).format(d);
}
