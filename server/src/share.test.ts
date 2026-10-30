import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import app from './app';

function createTestEnv() {
  const sqlite = new DatabaseSync(':memory:');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter((file) => file.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
  const DB = {
    prepare(query: string) {
      return {
        bind(...params: unknown[]) {
          const stmt = sqlite.prepare(query);
          return {
            async run() {
              stmt.run(...(params as (string | number | null)[]));
              return { success: true };
            },
            async first<T>() {
              return (stmt.get(...(params as (string | number | null)[])) as T | undefined) ?? null;
            },
            async all<T>() {
              return { results: stmt.all(...(params as (string | number | null)[])) as T[] };
            },
          };
        },
      };
    },
  };
  return {
    sqlite,
    env: {
      DB: DB as unknown as D1Database,
      ENVIRONMENT: 'development',
      AUTH_PEPPER: 'test-pepper',
      APPLE_AUDIENCE: 'app.stack.mobile',
      REVENUECAT_WEBHOOK_AUTH: 'whsec-test',
    },
  };
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fill(start: string, count: number, value: number) {
  return Array.from({ length: count }, (_, index) => ({ date: addDays(start, index), value }));
}

const START = '2026-04-01';
const AS_OF = addDays(START, 89);

async function signIn(env: ReturnType<typeof createTestEnv>['env'], email: string) {
  const start = await app.request(
    '/v1/auth/email/start',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) },
    env,
  );
  const started = (await start.json()) as { devCode: string };
  const verified = await app.request(
    '/v1/auth/email/verify',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, code: started.devCode }),
    },
    env,
  );
  const session = (await verified.json()) as { token: string };
  return session.token;
}

const product = {
  id: 'mag',
  name: 'Magnesium glycinate',
  brand: 'Example',
  priceCents: 2499,
  servingsPerContainer: 60,
  servingsPerDay: 1,
  ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg', costWeight: 1 }],
};

describe('stack sharing', () => {
  it('shares doses and a score, keeps prices and samples out, and counts each copier once', async () => {
    const { env, sqlite } = createTestEnv();
    const owner = await signIn(env, 'owner@example.com');
    const auth = { authorization: `Bearer ${owner}`, 'content-type': 'application/json' };
    await app.request(
      '/v1/me/profile',
      { method: 'PUT', headers: auth, body: JSON.stringify({ ageRange: '30_39', sex: 'male', displayName: 'Alex' }) },
      env,
    );

    const created = await app.request(
      '/v1/shares',
      {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          displayName: 'Alex',
          products: [product],
          publicIndex: false,
          result: {
            metric: 'resting_hr_bpm',
            stackStart: START,
            device: 'Oura',
            asOf: AS_OF,
            samples: [...fill(addDays(START, -90), 60, 50), ...fill(START, 30, 47)],
          },
        }),
      },
      env,
    );
    expect(created.status).toBe(200);
    const share = (await created.json()) as {
      slug: string;
      auditScore: number;
      displayName: string;
      result: { line: string; disclaimer: string };
      copyCount: number;
      products: { name: string }[];
    };
    expect(share.auditScore).toBe(100);
    expect(share.displayName).toBe('Alex');
    expect(share.result.line).toBe('Resting heart rate down 6% over 90 days, measured on Oura');
    expect(share.result.disclaimer).toBe('1 person, not a trial');
    expect(share.copyCount).toBe(0);
    expect(JSON.stringify(share)).not.toContain('priceCents');
    expect(JSON.stringify(share)).not.toContain('2499');
    expect(JSON.stringify(share)).not.toContain('samples');

    const stored = sqlite.prepare('SELECT snapshot FROM shares').get() as { snapshot: string };
    expect(stored.snapshot).not.toContain('priceCents');
    expect(stored.snapshot).not.toContain('samples');
    expect(stored.snapshot).not.toContain('2499');

    const page = await app.request(`/s/${share.slug}`, { method: 'GET' }, env);
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('noindex');
    expect(html).toContain('Magnesium glycinate');
    expect(html).toContain('Magnesium: 200 mg');
    expect(html).toContain('Open in Stack');
    expect(html).toContain('Ask your doctor before changing your supplements.');
    expect(html).toContain('Copied by 0 people');
    expect(html).toContain(share.result.line);
    expect(html).not.toContain('$');
    expect(html).not.toContain('2499');

    const copier = await signIn(env, 'copier@example.com');
    const copied = await app.request(
      `/v1/shares/${share.slug}/copy`,
      { method: 'POST', headers: { authorization: `Bearer ${copier}` } },
      env,
    );
    const copyBody = (await copied.json()) as { alreadyCopied: boolean; credit: string; products: { priceCents?: number }[] };
    expect(copyBody.alreadyCopied).toBe(false);
    expect(copyBody.credit).toBe('Copied from Alex.');
    expect(copyBody.products[0]?.priceCents).toBeUndefined();

    const again = await app.request(
      `/v1/shares/${share.slug}/copy`,
      { method: 'POST', headers: { authorization: `Bearer ${copier}` } },
      env,
    );
    expect(((await again.json()) as { alreadyCopied: boolean }).alreadyCopied).toBe(true);
    const counted = sqlite.prepare('SELECT COUNT(*) AS n FROM share_copies').get() as { n: number };
    expect(counted.n).toBe(1);

    const ownerCopy = await app.request(
      `/v1/shares/${share.slug}/copy`,
      { method: 'POST', headers: { authorization: `Bearer ${owner}` } },
      env,
    );
    expect(ownerCopy.status).toBe(400);

    const unshared = await app.request('/v1/shares/current', { method: 'DELETE', headers: auth }, env);
    expect(unshared.status).toBe(200);
    const gone = await app.request(`/s/${share.slug}`, { method: 'GET' }, env);
    expect(gone.status).toBe(404);
    expect(await gone.text()).toContain('This stack is no longer shared.');
  });

  it('shows a copier average only at 10 people and keeps a people like you filter at the same bar', async () => {
    const { env } = createTestEnv();
    const owner = await signIn(env, 'owner2@example.com');
    const created = await app.request(
      '/v1/shares',
      {
        method: 'POST',
        headers: { authorization: `Bearer ${owner}`, 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Sam', products: [product], result: null }),
      },
      env,
    );
    const { slug } = (await created.json()) as { slug: string };
    const samples = [...fill(addDays(START, -90), 60, 40), ...fill(START, 30, 44)];

    for (let index = 0; index < 10; index += 1) {
      const token = await signIn(env, `person${index}@example.com`);
      const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
      await app.request(
        '/v1/me/profile',
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ageRange: index < 8 ? '30_39' : '50_59', sex: index < 8 ? 'male' : 'female' }),
        },
        env,
      );
      await app.request(`/v1/shares/${slug}/copy`, { method: 'POST', headers }, env);
      const outcome = await app.request(
        `/v1/shares/${slug}/outcome`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ metric: 'hrv_sdnn_ms', stackStart: START, device: 'Oura', asOf: AS_OF, samples }),
        },
        env,
      );
      const body = (await outcome.json()) as { aggregate: { people: number } | null };
      if (index < 9) expect(body.aggregate).toBeNull();
      else {
        expect(body.aggregate?.people).toBe(10);
      }
    }

    const page = await app.request(`/s/${slug}`, { method: 'GET' }, env);
    const html = await page.text();
    expect(html).toContain('Real-world data, not a trial');
    expect(html).toContain('Mostly men 30 to 39');
    expect(html).toContain('Copied by 10 people');

    const filtered = await app.request(`/v1/shares/${slug}/aggregate?ageRange=50_59&sex=female`, { method: 'GET' }, env);
    expect(((await filtered.json()) as { aggregate: unknown }).aggregate).toBeNull();
    const broad = await app.request(`/v1/shares/${slug}/aggregate?ageRange=30_39&sex=male`, { method: 'GET' }, env);
    expect(((await broad.json()) as { aggregate: { people: number } | null }).aggregate).toBeNull();
  });
});
