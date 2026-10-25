import { NextResponse } from "next/server";
import { withService } from "@/lib/db";

export const dynamic = "force-dynamic";

// Verificação de disponibilidade (Docker healthcheck). Não expõe dados de leads nem configuração.
export async function GET() {
  try {
    const r = await withService(async (db) => ({
      migrations: (await db.query("select count(*)::int n from schema_migrations")).rows[0].n,
      worker: (await db.query("select max(last_seen) t from worker_heartbeats")).rows[0].t,
    }));
    const workerAgeS = r.worker ? Math.round((Date.now() - new Date(r.worker).getTime()) / 1000) : null;
    return NextResponse.json({ status: "ok", db: "ok", migrations: r.migrations, workerLastSeenSecondsAgo: workerAgeS });
  } catch {
    return NextResponse.json({ status: "error", db: "unavailable" }, { status: 503 });
  }
}
