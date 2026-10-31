import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import app, { type Bindings } from '../src/app';

type Value = string | number | null | Uint8Array;

function toValue(value: unknown): Value {
  if (value === undefined) throw new Error('D1 does not accept undefined bind values');
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return value as Value;
}

/** In-memory D1 stand-in backed by node:sqlite, with every migration applied. */
export function createDb() {
  const sqlite = new DatabaseSync(':memory:');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter((file) => file.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }

  function statement(query: string, params: unknown[] = []) {
    const values = () => params.map(toValue);
    const stmt = () => sqlite.prepare(query);
    return {
      query,
      params,
      bind(...next: unknown[]) {
        return statement(query, next);
      },
      async run() {
        const info = stmt().run(...values());
        return { success: true, meta: { changes: Number(info.changes) } };
      },
      async first<T>() {
        return (stmt().get(...values()) as T | undefined) ?? null;
      },
      async all<T>() {
        return { success: true, results: stmt().all(...values()) as T[] };
      },
      runSync() {
        const prepared = stmt();
        const results = prepared.columns().length > 0 ? prepared.all(...values()) : (prepared.run(...values()), []);
        return { success: true, results };
      },
    };
  }

  const DB = {
    prepare(query: string) {
      return statement(query);
    },
    async batch(list: ReturnType<typeof statement>[]) {
      sqlite.exec('BEGIN');
      try {
        const out = list.map((item) => item.runSync());
        sqlite.exec('COMMIT');
        return out;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 1 };
    },
  };
  return { sqlite, DB: DB as unknown as D1Database };
}

export function createTestEnv(overrides: Partial<Bindings> = {}) {
  const { sqlite, DB } = createDb();
  const env: Bindings = {
    DB,
    ENVIRONMENT: 'development',
    AUTH_PEPPER: 'test-pepper',
    APPLE_AUDIENCE: 'app.stack.mobile',
    REVENUECAT_WEBHOOK_AUTH: 'whsec-test',
    ...overrides,
  };
  return { sqlite, env };
}

export type TestEnv = ReturnType<typeof createTestEnv>['env'];

let address = 0;

/** Each call looks like a different device so per address limits do not interfere. */
export function freshAddress(): string {
  address += 1;
  return `10.0.${Math.floor(address / 250)}.${address % 250}`;
}

export async function request(
  env: TestEnv,
  path: string,
  init: { method?: string; token?: string; body?: unknown; ip?: string; userAgent?: string } = {},
) {
  const headers: Record<string, string> = { 'cf-connecting-ip': init.ip ?? freshAddress() };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.userAgent) headers['user-agent'] = init.userAgent;
  return app.request(
    `http://localhost${path}`,
    { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) },
    env,
  );
}

export async function json<T = Record<string, unknown>>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/** Signs in through the local development path, which returns the code only to localhost. */
export async function signIn(env: TestEnv, email: string): Promise<string> {
  const started = await json<{ devCode?: string }>(await request(env, '/v1/auth/email/start', { method: 'POST', body: { email } }));
  if (!started.devCode) throw new Error('No development code');
  const verified = await json<{ token: string }>(
    await request(env, '/v1/auth/email/verify', { method: 'POST', body: { email, code: started.devCode } }),
  );
  return verified.token;
}

/** Sets a public username when the account does not have one yet. Sharing requires it. */
export async function ensureUsername(env: TestEnv, token: string, preferred?: string): Promise<string> {
  const me = await json<{ profile?: { username?: string | null } }>(await request(env, '/v1/me', { token }));
  if (me.profile?.username) return me.profile.username;
  const name = preferred ?? `id${Math.random().toString(36).slice(2, 10)}`;
  const response = await request(env, '/v1/me/username', { method: 'PUT', token, body: { username: name } });
  const body = await json<{ username?: string; error?: string }>(response);
  if (!response.ok || !body.username) throw new Error(body.error ?? 'Could not set a username');
  return body.username;
}

/** Moves a user's account back in time so copy counting treats it as established. */
export function ageAccount(sqlite: DatabaseSync, email: string, days: number) {
  const created = new Date(Date.now() - days * 86_400_000).toISOString();
  sqlite.prepare('UPDATE users SET created_at = ? WHERE email = ?').run(created, email);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
