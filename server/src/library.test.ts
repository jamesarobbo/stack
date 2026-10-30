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

async function signIn(env: ReturnType<typeof createTestEnv>['env'], email: string) {
  const start = await app.request(
    '/v1/auth/email/start',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) },
    env,
  );
  const started = (await start.json()) as { devCode: string };
  const verified = await app.request(
    '/v1/auth/email/verify',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code: started.devCode }) },
    env,
  );
  return ((await verified.json()) as { token: string }).token;
}

function product(name: string, key: string, amount = 100) {
  return {
    id: name,
    name,
    brand: 'Example',
    priceCents: 1999,
    servingsPerContainer: 30,
    servingsPerDay: 1,
    ingredients: [{ key, name: key[0]?.toUpperCase() + key.slice(1), amount, unit: 'mg' }],
  };
}

async function listStack(
  env: ReturnType<typeof createTestEnv>['env'],
  token: string,
  body: Record<string, unknown>,
) {
  const response = await app.request(
    '/v1/shares',
    { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) },
    env,
  );
  const share = (await response.json()) as { slug: string; auditScore: number; stackName: string };
  expect(response.status).toBe(200);
  return share;
}

describe('stack library', () => {
  it('lists only opted-in stacks, searches in D1, and ranks recent copies above old ones', async () => {
    const { env, sqlite } = createTestEnv();
    const alex = await signIn(env, 'alex@example.com');
    const sam = await signIn(env, 'sam@example.com');
    const hiddenOwner = await signIn(env, 'hidden@example.com');
    const quiet = await listStack(env, hiddenOwner, {
      displayName: 'Hidden',
      stackName: 'Private stack',
      publicIndex: false,
      products: [product('Private stack', 'zinc', 10)],
    });
    const listed = await listStack(env, alex, {
      displayName: 'Alex',
      stackName: 'Evening magnesium',
      goals: ['sleep', 'recovery', 'focus', 'energy'],
      publicIndex: true,
      products: [product('Evening magnesium', 'magnesium')],
    });
    expect(listed.stackName).toBe('Evening magnesium');

    const iron = await listStack(env, sam, {
      displayName: 'Sam',
      stackName: 'Morning iron',
      goals: ['energy'],
      publicIndex: true,
      products: [product('Morning iron', 'iron', 10)],
    });
    const notesOwner = await signIn(env, 'notes@example.com');
    const namedOnly = await listStack(env, notesOwner, {
      displayName: 'Sam',
      stackName: 'Magnesium notes',
      goals: ['focus'],
      publicIndex: true,
      products: [product('Magnesium notes', 'vitamin-c', 100)],
    });

    const hidden = await app.request('/v1/library?tab=new', { method: 'GET' }, env);
    const page = (await hidden.json()) as { items: { slug: string; stackName: string }[] };
    expect(page.items.map((item) => item.slug)).not.toContain(quiet.slug);
    expect(page.items.map((item) => item.stackName)).toEqual(expect.arrayContaining(['Evening magnesium', 'Magnesium notes', 'Morning iron']));
    expect(JSON.stringify(page)).not.toContain('priceCents');
    expect(JSON.stringify(page)).not.toContain('1999');
    expect(JSON.stringify(page)).not.toContain('$');

    const byName = await app.request('/v1/library?q=evening', { method: 'GET' }, env);
    expect(((await byName.json()) as { items: { slug: string }[] }).items.map((item) => item.slug)).toEqual([listed.slug]);

    const byIngredient = await app.request('/v1/library?q=has%20magnesium', { method: 'GET' }, env);
    const ingredientHits = ((await byIngredient.json()) as { items: { slug: string }[] }).items.map((item) => item.slug);
    expect(ingredientHits).toContain(listed.slug);
    expect(ingredientHits).not.toContain(namedOnly.slug);

    const byGoal = await app.request('/v1/library?goal=sleep', { method: 'GET' }, env);
    expect(((await byGoal.json()) as { items: { slug: string }[] }).items.map((item) => item.slug)).toEqual([listed.slug]);

    const byCreator = await app.request('/v1/library?q=alex', { method: 'GET' }, env);
    expect(((await byCreator.json()) as { items: { slug: string }[] }).items.map((item) => item.slug)).toEqual([listed.slug]);

    const overlapOwner = await signIn(env, 'overlap@example.com');
    const overlap = await listStack(env, overlapOwner, {
      displayName: 'Overlap',
      stackName: 'Two magnesium',
      publicIndex: true,
      products: [
        { ...product('Glycinate', 'magnesium', 100), id: 'g1' },
        { ...product('Citrate', 'magnesium', 100), id: 'g2' },
      ],
    });
    const byScore = await app.request('/v1/library?sort=score', { method: 'GET' }, env);
    const scores = ((await byScore.json()) as { items: { slug: string; auditScore: number }[] }).items;
    expect(scores.map((item) => item.auditScore)).toEqual([...scores.map((item) => item.auditScore)].sort((a, b) => b - a));
    expect(scores[0]?.auditScore).toBeGreaterThan(scores.find((item) => item.slug === overlap.slug)?.auditScore ?? 100);

    const stamps = sqlite.prepare('SELECT created_at, updated_at FROM shares WHERE slug = ?').get(iron.slug) as {
      created_at: string;
      updated_at: string;
    };
    expect(stamps.created_at).toBe(stamps.updated_at);
    const newest = await app.request('/v1/library?tab=new', { method: 'GET' }, env);
    expect(((await newest.json()) as { items: { slug: string }[] }).items.some((item) => item.slug === iron.slug)).toBe(true);

    const copierA = await signIn(env, 'copy-a@example.com');
    const copierB = await signIn(env, 'copy-b@example.com');
    await app.request(`/v1/shares/${iron.slug}/copy`, { method: 'POST', headers: { authorization: `Bearer ${copierA}` } }, env);
    await app.request(`/v1/shares/${listed.slug}/copy`, { method: 'POST', headers: { authorization: `Bearer ${copierB}` } }, env);
    sqlite.prepare(`UPDATE share_copies SET copied_at = '2020-01-01T00:00:00.000Z' WHERE share_id = (SELECT id FROM shares WHERE slug = ?)`).run(iron.slug);

    const top = await app.request('/v1/library?tab=top&now=2026-10-30T00:00:00.000Z', { method: 'GET' }, env);
    const topItems = ((await top.json()) as { items: { slug: string; recentCopies: number }[] }).items;
    expect(topItems[0]?.slug).toBe(listed.slug);
    expect(topItems.find((item) => item.slug === iron.slug)?.recentCopies).toBe(0);
    expect(topItems.find((item) => item.slug === listed.slug)?.recentCopies).toBe(1);

    const pageOne = await app.request('/v1/library?tab=new&sort=newest&limit=2', { method: 'GET' }, env);
    const first = (await pageOne.json()) as { items: unknown[]; nextOffset: number | null };
    expect(first.items).toHaveLength(2);
    expect(first.nextOffset).toBe(2);
    const pageTwo = await app.request('/v1/library?tab=new&sort=newest&limit=2&offset=2', { method: 'GET' }, env);
    const second = (await pageTwo.json()) as { items: unknown[]; nextOffset: number | null };
    expect(second.items).toHaveLength(2);
    expect(second.nextOffset).toBeNull();
  });

  it('drops an unlisted stack from Saved and only sorts people like you inside one cohort of at least 10', async () => {
    const { env, sqlite } = createTestEnv();
    const owner = await signIn(env, 'owner@example.com');
    const men = await listStack(env, owner, {
      displayName: 'Owner',
      stackName: 'Men cohort',
      publicIndex: true,
      products: [product('Men cohort', 'magnesium')],
    });
    const womenOwner = await signIn(env, 'women@example.com');
    const women = await listStack(env, womenOwner, {
      displayName: 'Women',
      stackName: 'Women cohort',
      publicIndex: true,
      products: [product('Women cohort', 'iron', 8)],
    });

    const reader = await signIn(env, 'reader@example.com');
    const headers = { authorization: `Bearer ${reader}`, 'content-type': 'application/json' };
    const save = await app.request(`/v1/shares/${men.slug}/save`, { method: 'POST', headers }, env);
    expect(save.status).toBe(200);
    const report = await app.request(
      `/v1/shares/${men.slug}/report`,
      { method: 'POST', headers, body: JSON.stringify({ reason: 'The doses look wrong' }) },
      env,
    );
    expect(report.status).toBe(200);
    expect((sqlite.prepare('SELECT COUNT(*) AS n FROM share_reports').get() as { n: number }).n).toBe(1);

    const saved = await app.request('/v1/library?tab=saved', { headers }, env);
    expect(((await saved.json()) as { items: { slug: string }[] }).items.map((item) => item.slug)).toEqual([men.slug]);

    await listStack(env, owner, {
      displayName: 'Owner',
      stackName: 'Men cohort',
      publicIndex: false,
      products: [product('Men cohort', 'magnesium')],
    });
    const after = await app.request('/v1/library?tab=saved', { headers }, env);
    expect(((await after.json()) as { items: unknown[] }).items).toEqual([]);
    expect((sqlite.prepare('SELECT COUNT(*) AS n FROM share_saves').get() as { n: number }).n).toBe(0);

    await listStack(env, owner, {
      displayName: 'Owner',
      stackName: 'Men cohort',
      publicIndex: true,
      products: [product('Men cohort', 'magnesium')],
    });

    const start = '2026-04-01';
    const samples = samplesFor(start);
    for (let index = 0; index < 10; index += 1) {
      const token = await signIn(env, `man${index}@example.com`);
      const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
      await app.request('/v1/me/profile', { method: 'PUT', headers: auth, body: JSON.stringify({ ageRange: '30_39', sex: 'male' }) }, env);
      await app.request(`/v1/shares/${men.slug}/copy`, { method: 'POST', headers: auth }, env);
      await app.request(
        `/v1/shares/${men.slug}/outcome`,
        {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ metric: 'hrv_sdnn_ms', stackStart: start, device: 'Oura', asOf: '2026-06-29', samples }),
        },
        env,
      );
    }
    for (let index = 0; index < 10; index += 1) {
      const token = await signIn(env, `woman${index}@example.com`);
      const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
      await app.request('/v1/me/profile', { method: 'PUT', headers: auth, body: JSON.stringify({ ageRange: '40_49', sex: 'female' }) }, env);
      await app.request(`/v1/shares/${women.slug}/copy`, { method: 'POST', headers: auth }, env);
      await app.request(
        `/v1/shares/${women.slug}/outcome`,
        {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ metric: 'hrv_sdnn_ms', stackStart: start, device: 'Oura', asOf: '2026-06-29', samples }),
        },
        env,
      );
    }
    const small = await signIn(env, 'small@example.com');
    await app.request(
      '/v1/me/profile',
      { method: 'PUT', headers: { authorization: `Bearer ${small}`, 'content-type': 'application/json' }, body: JSON.stringify({ ageRange: '30_39', sex: 'male' }) },
      env,
    );

    const menSort = await app.request('/v1/library?sort=like_you&ageRange=30_39&sex=male', { method: 'GET' }, env);
    const menItems = ((await menSort.json()) as { items: { slug: string; likeYou: { people: number; cohort: string } | null }[] }).items;
    expect(menItems.map((item) => item.slug)).toEqual([men.slug]);
    expect(menItems[0]?.likeYou?.people).toBe(10);
    expect(menItems[0]?.likeYou?.cohort).toBe('Mostly men 30 to 39');
    expect(menItems.some((item) => item.slug === women.slug)).toBe(false);

    const missing = await app.request('/v1/library?sort=like_you', { method: 'GET' }, env);
    const missingBody = (await missing.json()) as { items: unknown[]; note: string };
    expect(missingBody.items).toEqual([]);
    expect(missingBody.note).toContain('age range');
  });
});

function samplesFor(start: string) {
  const before = addDays(start, -90);
  const rows = [];
  for (let index = 0; index < 60; index += 1) rows.push({ date: addDays(before, index), value: 40 });
  for (let index = 0; index < 30; index += 1) rows.push({ date: addDays(start, index), value: 44 });
  return rows;
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
