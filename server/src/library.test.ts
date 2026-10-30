import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { ageAccount, createTestEnv, json, request, signIn, type TestEnv } from '../test/env';
import { scheduled } from './app';
import { ftsMatch } from './library';

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

type Item = { slug: string; stackName: string; copyCount: number | null; saved: boolean; likeYou: { line: string } | null; summary: string };
type Page = { items: Item[]; nextOffset: number | null; note: string | null };

async function listStack(env: TestEnv, email: string, body: Record<string, unknown>) {
  const token = await signIn(env, email);
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
  it('ranks top by recently kept copies and hides counts below 3', async () => {
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

  it('ranks people like you by copies kept by the same cohort', async () => {
    const { env, sqlite } = createTestEnv();
    const women = await listStack(env, 'w@example.com', { products: [product('Calm', 'magnesium')], stackName: 'Kept by women' });
    const men = await listStack(env, 'm@example.com', { products: [product('Zinc', 'zinc', 10)], stackName: 'Kept by men' });
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
    expect(like.items.map((item) => item.stackName)).toEqual(['Kept by women']);
  });
});
