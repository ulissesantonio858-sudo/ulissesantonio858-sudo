/* Aplica as migrações em supabase/migrations por ordem, registando-as em public.schema_migrations.
   Uso: DATABASE_URL=... npx tsx scripts/migrate.ts [--local-shim] */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

export async function migrate(databaseUrl: string, opts: { localShim?: boolean; log?: boolean } = {}) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const root = path.resolve(__dirname, "..");
    if (opts.localShim) await client.query(readFileSync(path.join(root, "scripts/local-auth-shim.sql"), "utf8"));
    await client.query("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const dir = path.join(root, "supabase/migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      const done = await client.query("select 1 from public.schema_migrations where name = $1", [file]);
      if (done.rowCount) continue;
      await client.query("begin");
      try {
        await client.query(readFileSync(path.join(dir, file), "utf8"));
        await client.query("insert into public.schema_migrations(name) values ($1)", [file]);
        await client.query("commit");
        if (opts.log) console.log(`aplicada: ${file}`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL em falta"); process.exit(1); }
  migrate(url, { localShim: process.argv.includes("--local-shim"), log: true })
    .then(() => console.log("migrações concluídas"))
    .catch((e) => { console.error(e); process.exit(1); });
}
