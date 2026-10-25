import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { withService } from "./db";

/* Sessão local assinada (HMAC-SHA256). Usada quando a app corre no seu computador sem Supabase. */

export const SESSION_COOKIE = "udev_session";
export const DEMO_USER_ID = "00000000-0000-4000-8000-00000000de30";

export interface SessionPayload { sub: string; email: string; demo: boolean; exp: number }

let cachedSecret: string | null = null;

/** Segredo: SESSION_SECRET do ambiente ou, se não existir, gerado uma vez e guardado na base de dados. */
export async function sessionSecret(): Promise<string> {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  cachedSecret = await withService(async (db) => {
    await db.query("insert into app_config (key, value) values ('session_secret', $1) on conflict (key) do nothing", [randomBytes(32).toString("hex")]);
    return (await db.query("select value from app_config where key = 'session_secret'")).rows[0].value as string;
  });
  return cachedSecret;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function signSession(p: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify(p));
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    return p.exp > now ? p : null;
  } catch { return null; }
}

/** Identificador estável do utilizador local, derivado do email (os dados sobrevivem a reinícios). */
export function localUserId(email: string): string {
  const h = createHash("sha256").update("udev-local:" + email.trim().toLowerCase()).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Comparação de credenciais em tempo constante. */
export function credentialsMatch(email: string, password: string, expectedEmail: string, expectedPassword: string): boolean {
  const d = (s: string) => createHash("sha256").update(s).digest();
  const okEmail = timingSafeEqual(d(email.trim().toLowerCase()), d(expectedEmail.trim().toLowerCase()));
  const okPass = timingSafeEqual(d(password), d(expectedPassword));
  return okEmail && okPass;
}
