/* Worker de segundo plano: processa a fila persistente (pesquisas, reverificações, purga por retenção).
   Uso: npm run worker   (ou: npm run worker -- --once para processar o que houver e sair) */
import { processOneJob } from "../src/lib/pipeline/jobs";
import { getPool, withService } from "../src/lib/db";

async function main() {
  const once = process.argv.includes("--once");
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; console.log("a terminar após o trabalho atual…"); });
  process.on("SIGTERM", () => { stopping = true; });
  let lastPurge = 0;
  console.log("worker iniciado");
  while (!stopping) {
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
  await getPool().end();
}
main();
