import { withUser } from "@/lib/db";
import { Notice } from "./ui";

/** Aviso quando o worker não dá sinal de vida: sem ele as pesquisas ficam em fila. */
export async function WorkerStatus({ userId }: { userId: string }) {
  const age = await withUser(userId, async (db) =>
    (await db.query("select extract(epoch from now() - max(last_seen))::float8 s from worker_heartbeats")).rows[0].s as number | null);
  if (age != null && age < 90) return null;
  return (
    <Notice t="bad">
      O worker de pesquisas não está ativo{age != null ? ` (último sinal há ${Math.round(age / 60)} min)` : ""}: as pesquisas e reverificações ficam em fila até ele arrancar.
      No Docker: <code>docker compose up -d worker</code>; sem Docker: <code>npm run worker</code>.
    </Notice>
  );
}
