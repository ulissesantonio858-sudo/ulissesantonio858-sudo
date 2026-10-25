/* Worker de segundo plano: processa a fila persistente (pesquisas, reverificações, purga por retenção).
   Uso: npm run worker   (ou: npm run worker -- --once para processar o que houver e sair) */
import { writeFileSync } from "node:fs";
import os from "node:os";
import { processOneJob, WORKER_ID } from "../src/lib/pipeline/jobs";
import { getPool, withService } from "../src/lib/db";

const HEARTBEAT_FILE = process.env.WORKER_HEARTBEAT_FILE ?? `${os.tmpdir()}/udev-worker-heartbeat`;

async function heartbeat() {
  writeFileSync(HEARTBEAT_FILE, String(Date.now()));
  await withService((db) => db.query(
    `insert into worker_heartbeats (worker_id, last_seen, info) values ($1, now(), $2)
     on conflict (worker_id) do update set last_seen = now(), info = excluded.info`, [WORKER_ID, JSON.stringify({ pid: process.pid, host: os.hostname() })]));
}

async function main() {
  const once = process.argv.includes("--once");
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; console.log("a terminar após o trabalho atual…"); });
  process.on("SIGTERM", () => { stopping = true; });
  let lastPurge = 0;
  let lastBeat = 0;
  console.log(`worker iniciado (${WORKER_ID})`);
  while (!stopping) {
    if (Date.now() - lastBeat > 15_000) { lastBeat = Date.now(); await heartbeat().catch((e) => console.error("heartbeat:", e.message)); }
    // Purga de conteúdo expirado (retenção), no máximo de hora a hora, para cada utilizador com dados
    if (Date.now() - lastPurge > 3_600_000) {
      lastPurge = Date.now();
      await withService((db) => db.query(
        `insert into jobs (owner_id, type, ref_id) select distinct owner_id, 'purge_expired', owner_id from evidences where expires_at < now() and value is not null
         on conflict (type, ref_id) where status in ('queued','running') do nothing`)).catch((e) => console.error("purga:", e.message));
    }
    const did = await processOneJob().catch((e) => { console.error("erro no worker:", e); return false; });
    if (!did) {
      if (once) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  await withService((db) => db.query("delete from worker_heartbeats where worker_id = $1", [WORKER_ID])).catch(() => {});
  await getPool().end();
}
main();
