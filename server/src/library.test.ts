import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { ageAccount, createTestEnv, ensureUsername, json, request, signIn, type TestEnv } from '../test/env';
import { scheduled } from './app';
import { ftsMatch, TOP_RANK_SQL, topScore } from './library';
import { isBotUserAgent, recordShareView } from './shareViews';

function product(name: string, key: string, amount = 100) {
  return {
    id: `${key}-${name}`,
    name,
    brand: 'Brand',
    servingsPerContainer: 30,
    servingsPerDay: 1,
    ingredients: [{ key, name: key, amount, unit: 'mg' }],
  };
}

type Item = {
  slug: string;
  stackName: string;
  creatorName: string | null;
  copyCount: number | null;
  viewCount: number | null;
  saved: boolean;
  likeYou: { line: string } | null;
  summary: string;
};
type Page = { items: Item[]; nextOffset: number | null; note: string | null };

async function listStack(env: TestEnv, email: string, body: Record<string, unknown>) {
  const token = await signIn(env, email);
  const local = email.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase();
  await ensureUsername(env, token, `id${local}`.slice(0, 20));
  const share = await json<{ slug: string }>(await request(env, '/v1/shares', { method: 'POST', token, body: { listed: true, ...body } }));
  return { token, slug: share.slug };
}

async function library(env: TestEnv, query: string, token?: string): Promise<Page> {
  return json<Page>(await request(env, `/v1/library${query}`, { token }));
}

async function keepCopies(env: TestEnv, sqlite: DatabaseSync, slug: string, people: { email: string; ageRange?: string; sex?: string }[]) {
  for (const person of people) {
    const token = await signIn(env, person.email);
    ageAccount(sqlite, person.email, 30);
    if (person.ageRange) await request(env, '/v1/me/profile', { method: 'PUT', token, body: { ageRange: person.ageRange, sex: person.sex } });
    await request(env, `/v1/shares/${slug}/copy`, { method: 'POST', token, body: {} });
  }
  sqlite.prepare('UPDATE share_copies SET copied_at = ? WHERE copied_at > ?').run(
    new Date(Date.now() - 10 * 86_400_000).toISOString(),
    new Date(Date.now() - 86_400_000).toISOString(),
  );
}

describe('search', () => {
  it('limits "has" searches to the ingredient column', () => {
    expect(ftsMatch('has magnesium zinc')).toBe('ingredients : ("magnesium"* AND "zinc"*)');
    expect(ftsMatch('sleep')).toBe('"sleep"*');
    expect(ftsMatch('  ')).toBeNull();
  });

  it('finds listed stacks by ingredient and leaves unlisted ones out', async () => {
    const { env } = createTestEnv();
    await listStack(env, 'a@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Evening calm', goals: ['sleep'] });
    await listStack(env, 'b@example.com', { products: [product('Zinc', 'zinc', 10)], stackName: 'Magnesium free' });
    await listStack(env, 'c@example.com', { products: [product('Calm', 'magnesium')], listed: false });

    const has = await library(env, '?q=has%20magnesium');
    expect(has.items.map((item) => item.stackName)).toEqual(['Evening calm']);
    const words = await library(env, '?q=magnesium');
    expect(words.items).toHaveLength(2);
    const goal = await library(env, '?goal=sleep');
    expect(goal.items.map((item) => item.stackName)).toEqual(['Evening calm']);
    expect(goal.items[0]?.summary).toBe('No doses above the upper limit and nothing doubled up');
  });

  it('pages with nextOffset', async () => {
    const { env } = createTestEnv();
    for (let index = 0; index < 3; index += 1) {
      await listStack(env, `p${index}@example.com`, { products: [product(`P${index}`, 'zinc', 10)], stackName: `Stack ${index}` });
    }
    const first = await library(env, '?limit=2');
    expect(first.items).toHaveLength(2);
    expect(first.nextOffset).toBe(2);
    const second = await library(env, `?limit=2&offset=${first.nextOffset}`);
    expect(second.items).toHaveLength(1);
    expect(second.nextOffset).toBeNull();
  });
});

describe('segments', () => {
  it('ranks top by recent copies and hides counts below 3', async () => {
    const { env, sqlite } = createTestEnv();
    const popular = await listStack(env, 'pop@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Popular' });
    const quiet = await listStack(env, 'quiet@example.com', { products: [product('Zinc', 'zinc', 10)], stackName: 'Quiet' });
    await keepCopies(env, sqlite, popular.slug, [{ email: 'k1@example.com' }, { email: 'k2@example.com' }, { email: 'k3@example.com' }]);
    await keepCopies(env, sqlite, quiet.slug, [{ email: 'k4@example.com' }]);
    await scheduled(env);

    const top = await library(env, '?segment=top');
    expect(top.items.map((item) => [item.stackName, item.copyCount])).toEqual([
      ['Popular', 3],
      ['Quiet', null],
    ]);
  });

  it('shows saved stacks to their owner, including ones no longer listed', async () => {
    const { env } = createTestEnv();
    const maker = await listStack(env, 'maker@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Saved one' });
    expect((await library(env, '?segment=saved')).note).toBe('Sign in to see saved stacks.');
    const viewer = await signIn(env, 'viewer@example.com');
    await request(env, `/v1/shares/${maker.slug}/save`, { method: 'POST', token: viewer });
    expect((await library(env, '', viewer)).items[0]?.saved).toBe(true);

    await request(env, '/v1/shares', { method: 'POST', token: maker.token, body: { products: [product('Calm', 'magnesium')], listed: false } });
    const saved = await library(env, '?segment=saved', viewer);
    expect(saved.items).toHaveLength(0);
    const row = await request(env, `/v1/shares/${maker.slug}`, { token: viewer });
    expect(((await row.json()) as { viewer: { saved: boolean } }).viewer.saved).toBe(true);
  });

  it('ranks people like you by copies from the same cohort', async () => {
    const { env, sqlite } = createTestEnv();
    const women = await listStack(env, 'w@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Women' });
    const men = await listStack(env, 'm@example.com', { products: [product('Zinc', 'zinc', 10)], stackName: 'Men' });
    await keepCopies(
      env,
      sqlite,
      women.slug,
      [1, 2, 3].map((index) => ({ email: `wf${index}@example.com`, ageRange: '30_39', sex: 'female' })),
    );
    await keepCopies(
      env,
      sqlite,
      men.slug,
      [1, 2, 3, 4].map((index) => ({ email: `mm${index}@example.com`, ageRange: '30_39', sex: 'male' })),
    );

    const viewer = await signIn(env, 'viewer@example.com');
    expect((await library(env, '?segment=like_you', viewer)).note).toMatch(/Add an age range and sex/);
    await request(env, '/v1/me/profile', { method: 'PUT', token: viewer, body: { ageRange: '18_29', sex: 'female' } });
    const like = await library(env, '?segment=like_you', viewer);
    expect(like.items.map((item) => item.stackName)).toEqual(['Women']);
  });
});

const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

describe('top score', () => {
  it('weights copies above log views and decays with age', () => {
    expect(topScore({ copies: 1, views: 0, ageDays: 0 })).toBe(8);
    expect(topScore({ copies: 0, views: 100, ageDays: 0 })).toBeCloseTo(Math.log(101));
    expect(topScore({ copies: 1, views: 0, ageDays: 0 })).toBeGreaterThan(topScore({ copies: 0, views: 100, ageDays: 0 }));
    expect(topScore({ copies: 2, views: 0, ageDays: 21 })).toBeCloseTo(8);
    expect(topScore({ copies: 1, views: 0, ageDays: 0 })).toBeGreaterThan(topScore({ copies: 2, views: 0, ageDays: 60 }));
    expect(TOP_RANK_SQL).toContain('kept_count');
    expect(TOP_RANK_SQL).toContain('share_views');
    expect(TOP_RANK_SQL).toContain('ln(');
    expect(TOP_RANK_SQL).not.toMatch(/price|outcome|percent|audit_score/i);
  });
});

describe('top ranking', () => {
  it('puts one copy above many views, and a new copy above an older pair', async () => {
    const { env, sqlite } = createTestEnv();
    const copied = await listStack(env, 'c@example.com', { products: [product('Calm', 'magnesium')], stackName: 'One copy' });
    const viewed = await listStack(env, 'v@example.com', { products: [product('Zinc', 'zinc', 10)], stackName: 'Many views' });
    const older = await listStack(env, 'o@example.com', { products: [product('Iron', 'iron', 8)], stackName: 'Older' });
    const reader = await signIn(env, 'reader@example.com');
    await request(env, `/v1/shares/${copied.slug}/copy`, { method: 'POST', token: reader, body: {} });
    await request(env, `/v1/shares/${older.slug}/copy`, { method: 'POST', token: await signIn(env, 'two@example.com'), body: {} });
    await request(env, `/v1/shares/${older.slug}/copy`, { method: 'POST', token: await signIn(env, 'three@example.com'), body: {} });
    sqlite.prepare('UPDATE shares SET created_at = ? WHERE slug = ?').run(new Date(Date.now() - 60 * 86_400_000).toISOString(), older.slug);

    const row = sqlite.prepare('SELECT id, user_id FROM shares WHERE slug = ?').get(viewed.slug) as { id: string; user_id: string };
    for (let index = 0; index < 100; index += 1) {
      await recordShareView(env.DB, {
        shareId: row.id,
        ownerId: row.user_id,
        viewerId: `viewer-${index}`,
        userAgent: BROWSER,
      });
    }

    const top = await library(env, '?segment=top');
    expect(top.items.map((item) => item.stackName)).toEqual(['One copy', 'Many views', 'Older']);
    expect(top.items.find((item) => item.stackName === 'Many views')?.viewCount).toBe(100);
    expect(top.items.find((item) => item.stackName === 'One copy')?.viewCount).toBeNull();
  });

  it('does not move a stack up because it has a personal result', async () => {
    const { env, sqlite } = createTestEnv();
    const result = { metric: 'resting_hr_bpm', direction: 'down', percent: -6, withinNormal: false, windowDays: 84, device: 'Apple Watch' };
    await listStack(env, 'a@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Alpha' });
    await listStack(env, 'z@example.com', { products: [product('Zinc', 'zinc', 10)], stackName: 'Zinc', result });
    sqlite.prepare('UPDATE shares SET created_at = ?').run('2026-06-01T00:00:00.000Z');
    const top = await library(env, '?segment=top');
    expect(top.items.map((item) => item.stackName)).toEqual(['Alpha', 'Zinc']);
  });

  it('counts a browser once per day and skips the owner and bots', async () => {
    const { env, sqlite } = createTestEnv();
    const listed = await listStack(env, 'maker@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Viewed' });
    const row = sqlite.prepare('SELECT id, user_id FROM shares WHERE slug = ?').get(listed.slug) as { id: string; user_id: string };
    const day = new Date('2026-04-01T12:00:00.000Z');
    const next = new Date('2026-04-02T12:00:00.000Z');
    expect(await recordShareView(env.DB, { shareId: row.id, ownerId: row.user_id, viewerId: 'u1', userAgent: BROWSER, now: day })).toBe(true);
    expect(await recordShareView(env.DB, { shareId: row.id, ownerId: row.user_id, viewerId: 'u1', userAgent: BROWSER, now: day })).toBe(false);
    expect(await recordShareView(env.DB, { shareId: row.id, ownerId: row.user_id, viewerId: 'u1', userAgent: BROWSER, now: next })).toBe(true);
    expect(await recordShareView(env.DB, { shareId: row.id, ownerId: row.user_id, viewerId: row.user_id, userAgent: BROWSER, now: day })).toBe(false);
    expect(await recordShareView(env.DB, { shareId: row.id, ownerId: row.user_id, viewerId: 'u2', userAgent: BOT, now: day })).toBe(false);
    expect(isBotUserAgent('')).toBe(true);
    expect(isBotUserAgent(BROWSER)).toBe(false);

    const ip = '10.4.4.4';
    await request(env, `/s/${listed.slug}`, { ip, userAgent: BROWSER });
    await request(env, `/s/${listed.slug}`, { ip, userAgent: BROWSER });
    await request(env, `/s/${listed.slug}`, { ip, userAgent: BOT });
    await request(env, `/v1/shares/${listed.slug}`, { token: listed.token, userAgent: BROWSER, ip });
    const other = await signIn(env, 'other@example.com');
    await request(env, `/v1/shares/${listed.slug}`, { token: other, userAgent: BROWSER, ip: '10.4.4.5' });
    await request(env, `/v1/shares/${listed.slug}`, { token: other, userAgent: BROWSER, ip: '10.4.4.6' });
    const views = sqlite.prepare('SELECT COUNT(*) AS n FROM share_views WHERE share_id = ?').get(row.id) as { n: number };
    expect(views.n).toBe(4);
  });
});
