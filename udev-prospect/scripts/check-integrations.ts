/* Diagnóstico das integrações a partir da linha de comandos: npm run check:integrations */
import { checkIntegrations } from "../src/lib/providers/check";
import { getPool } from "../src/lib/db";

const ICON = { ok: "OK   ", not_configured: "N/CFG", failed: "FALHA" } as const;

checkIntegrations().then(async (rs) => {
  for (const r of rs) console.log(`[${ICON[r.status]}] ${r.label}${r.required ? " (obrigatório)" : ""}: ${r.detail}`);
  const ready = rs.some((r) => (r.id === "google_places" || r.id === "osm") && r.status === "ok");
  console.log(ready ? "\nPronto para pesquisar: há pelo menos uma fonte de descoberta a responder." : "\nNÃO é possível pesquisar empresas reais: nenhuma fonte de descoberta respondeu.");
  await getPool().end();
  process.exit(rs.some((r) => r.required && r.status !== "ok") ? 1 : 0);
});
