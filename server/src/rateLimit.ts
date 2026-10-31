import { sha256Hex } from './crypto';

/** Fixed window counter in D1. Returns false once the key has used `limit` calls in the window. */
export async function allow(db: D1Database, key: string, limit: number, windowSeconds: number, now = Date.now()): Promise<boolean> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
         window_start = excluded.window_start
       RETURNING count`,
    )
    .bind(key, windowStart)
    .first<{ count: number }>();
  return (row?.count ?? 1) <= limit;
}

/** Client address from Cloudflare, or a fixed value in tests and local dev. */
export function clientAddress(header: (name: string) => string | undefined): string {
  return header('cf-connecting-ip') ?? header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/** Keyed hash so stored keys cannot be reversed into an address without the pepper. */
export async function addressKey(pepper: string, address: string): Promise<string> {
  return (await sha256Hex(`${pepper}:addr:${address}`)).slice(0, 32);
}
