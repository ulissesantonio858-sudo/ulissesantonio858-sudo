import { Pool, type PoolClient } from "pg";

/*
 * Acesso à base de dados (Postgres/Supabase) a partir do servidor.
 * withUser() abre uma transação com o papel "authenticated" e o utilizador nas claims JWT,
 * para que as políticas RLS (owner_id = auth.uid()) se apliquem em todas as consultas.
 */

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada");
    pool = new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 5), idleTimeoutMillis: 30_000 });
  }
  return pool;
}

export function setPool(p: Pool | null) { pool = p; }

export type Db = PoolClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function withUser<T>(userId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  if (!UUID_RE.test(userId)) throw new Error("utilizador inválido");
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)",
      [JSON.stringify({ sub: userId, role: "authenticated" }), userId]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Só para o worker: reclamar trabalhos de qualquer utilizador. O trabalho em si corre depois com withUser(). */
export async function withService<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
