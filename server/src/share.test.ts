import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { ageAccount, createTestEnv, ensureUsername, json, request, signIn, type TestEnv } from '../test/env';
import { scheduled } from './app';
import { ogImageVersion, storyImageVersion } from './og';

const magnesium = {
  id: 'mag',
  name: 'Magnesium glycinate',
  brand: 'Acme',
  servingsPerContainer: 60,
  servingsPerDay: 2,
  ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 100, unit: 'mg' }],
};

const vitaminD = {
  id: 'vitd',
  name: 'Vitamin D3',
  brand: 'Sun',
  servingsPerContainer: 90,
  servingsPerDay: 1,
  ingredients: [{ key: 'vitamin-d', name: 'Vitamin D', amount: 25, unit: 'mcg' }],
};

const restingResult = { metric: 'resting_hr_bpm', direction: 'down', percent: -6, withinNormal: false, windowDays: 84, device: 'Apple Watch' };

type View = {
  slug: string;
  url: string;
  stackName: string;
  version: number;
  copyCount: number | null;
  changes: string[];
  updatedOn: string | null;
  result: { line: string; disclaimer: string } | null;
  score: { score: number; summary: string; reasons: { kind: string; text: string }[] };
  viewer: { copied: { current: boolean; outcomeConsent: boolean } | null; saved: boolean; own: boolean } | null;
};

async function publish(env: TestEnv, token: string, body: Record<string, unknown>, username?: string) {
  await ensureUsername(env, token, username);
  return request(env, '/v1/shares', { method: 'POST', token, body });
}

async function copier(env: TestEnv, sqlite: DatabaseSync, email: string, profile: { ageRange: string; sex: string } | null = null) {
  const token = await signIn(env, email);
  ageAccount(sqlite, email, 30);
  if (profile) await request(env, '/v1/me/profile', { method: 'PUT', token, body: profile });
  return token;
}

function backdateCopies(sqlite: DatabaseSync, days: number) {
  const when = new Date(Date.now() - days * 86_400_000).toISOString();
  sqlite.prepare('UPDATE share_copies SET copied_at = ?').run(when);
}

describe('publishing', () => {
  it('publishes a snapshot with a score and reasons, and a public page with no health claims', async () => {
    const { env } = createTestEnv({ APP_STORE_ID: '123456789' });
    const token = await signIn(env, 'maker@example.com');
    const response = await publish(env, token, { products: [magnesium, vitaminD], displayName: 'Sam', goals: ['sleep'] }, 'sam_lifts');
    expect(response.status).toBe(200);
    const share = await json<View & { username: string | null; displayName: string | null }>(response);
    expect(share.url).toBe(`http://localhost/s/${share.slug}`);
    expect(share.stackName).toBe('Magnesium glycinate');
    expect(share.displayName).toBeNull();
    expect(share.username).toBe('sam_lifts');
    expect(share.score.score).toBe(100);
    expect(share.copyCount).toBeNull();

    const page = await request(env, `/s/${share.slug}`);
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('apple-itunes-app');
    expect(html).toContain(`/s/${share.slug}/og.png?v=${ogImageVersion(share.version)}`);
    expect(html).toContain(`/s/${share.slug}/story.png?v=${storyImageVersion(share.version)}`);
    expect(html).toContain('og:image');
    expect(html).not.toMatch(/proven|clinically|cures?\b/i);
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(html).not.toContain('Typical change');
    expect(html).toContain('@sam_lifts');
    expect(html).not.toContain('Sam');
    expect(html).not.toContain('Copied by');
    expect(html).not.toContain('Kept by');

    const svg = await request(env, `/s/${share.slug}/og.svg`);
    const text = await svg.text();
    expect(text).toContain('Magnesium glycinate');
    expect(text).toContain('@sam_lifts');
    expect(text).not.toContain('Sam');
    expect(text).toContain('>100<');
    expect(text).not.toContain('1 person');
    const story = await (await request(env, `/s/${share.slug}/story.svg`)).text();
    expect(story).toContain('width="1080"');
    expect(story).toContain('>100<');
  });

  it('rejects names with links or health claims and keeps risky stacks out of Discover', async () => {
    const { env, sqlite } = createTestEnv();
    const token = await signIn(env, 'maker@example.com');
    const linked = await publish(env, token, { products: [magnesium], stackName: 'Visit stackdeals.com' });
    expect(linked.status).toBe(400);
    const claim = await publish(env, token, { products: [magnesium], stackName: 'Cures anxiety' });
    expect(claim.status).toBe(400);
    const contact = await publish(env, token, { products: [{ ...magnesium, name: 'DM @stackguy for codes' }] });
    expect(contact.status).toBe(400);

    const heavy = { ...vitaminD, ingredients: [{ key: 'vitamin-d', name: 'Vitamin D', amount: 250, unit: 'mcg' }] };
    const risky = await json<View>(await publish(env, token, { products: [heavy], listed: true }));
    const row = sqlite.prepare('SELECT listed, discover_ok FROM shares WHERE slug = ?').get(risky.slug) as { listed: number; discover_ok: number };
    expect(row).toEqual({ listed: 1, discover_ok: 0 });
    expect(risky.score.reasons[0]?.kind).toBe('over');
    const library = await json<{ items: unknown[] }>(await request(env, '/v1/library'));
    expect(library.items).toHaveLength(0);
  });

  it('validates the personal result and keeps it on update', async () => {
    const { env } = createTestEnv();
    const token = await signIn(env, 'maker@example.com');
    for (const bad of [
      { ...restingResult, percent: -80, direction: 'down' },
      { ...restingResult, percent: -2 },
      { ...restingResult, direction: 'up' },
      { ...restingResult, windowDays: 30 },
      { ...restingResult, metric: 'weight' },
      { ...restingResult, percent: -6.5 },
    ]) {
      expect((await publish(env, token, { products: [magnesium], result: bad })).status).toBe(400);
    }
    const shared = await json<View>(await publish(env, token, { products: [magnesium], result: restingResult }));
    expect(shared.result?.line).toBe('Resting heart rate down 6% over 12 weeks, measured on Apple Watch');
    expect(shared.result?.disclaimer).toBe('1 person, not a trial');
    const page = await (await request(env, `/s/${shared.slug}`)).text();
    expect(page).toContain('6%');
    expect(page).toContain('12 weeks before against 12 weeks after');
    expect(page).toContain('1 person, not a trial');
    expect(page).toContain("One person's wearable. Not proof it caused the change.");
    expect(page).toContain('lower<sup>*</sup>');
    expect(page).toContain('Apple Watch');
    expect(page).not.toContain('Typical change');
    const image = await (await request(env, `/s/${shared.slug}/og.svg`)).text();
    expect(image).toContain('6%');
    expect(image).toContain('1 person, not a trial');

    const kept = await json<View>(await publish(env, token, { products: [magnesium, vitaminD], result: 'keep' }));
    expect(kept.slug).toBe(shared.slug);
    expect(kept.result?.line).toBe(shared.result?.line);
    const removed = await json<View>(await publish(env, token, { products: [magnesium, vitaminD], result: null }));
    expect(removed.result).toBeNull();
    expect(removed.changes).toContain('Personal result removed');
  });
});

describe('versions and copies', () => {
  it('counts each account once and does not restart the copy count when the doses change', async () => {
    const { env, sqlite } = createTestEnv();
    const maker = await signIn(env, 'maker@example.com');
    const share = await json<View>(await publish(env, maker, { products: [magnesium], listed: true }));

    const tokens: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const token = await copier(env, sqlite, `copier${index}@example.com`);
      const copied = await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token, body: { outcomeConsent: false } });
      expect(copied.status).toBe(200);
      tokens.push(token);
    }
    const fresh = await signIn(env, 'fresh@example.com');
    expect((await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token: fresh, body: {} })).status).toBe(200);
    const again = await json<{ restarted: boolean }>(
      await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token: tokens[0], body: {} }),
    );
    expect(again.restarted).toBe(false);
    expect((await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token: maker, body: {} })).status).toBe(400);

    await scheduled(env);
    expect((await json<View>(await request(env, `/v1/shares/${share.slug}`))).copyCount).toBe(4);

    const kept = {
      id: 'k1',
      name: 'Magnesium glycinate',
      brand: null,
      note: null,
      priceCents: 0,
      servingsPerContainer: 60,
      servingsPerDay: 2,
      startDate: '2026-01-01',
      catalogueId: `share:${share.slug}:off`,
      ingredients: [],
    };
    const synced = await request(env, '/v1/sync/stack', { method: 'PUT', token: tokens[1], body: { products: [kept] } });
    expect(synced.status).toBe(200);
    await request(env, '/v1/sync/stack', { method: 'PUT', token: tokens[0], body: { products: [] } });
    await scheduled(env);
    expect((await json<View>(await request(env, `/v1/shares/${share.slug}`))).copyCount).toBe(4);

    const page = await (await request(env, `/s/${share.slug}`)).text();
    expect(page).toContain('aria-label="4 copies"');
    expect(page).not.toContain('Copied by');
    expect(page).not.toContain('Kept by');
    const svg = await (await request(env, `/s/${share.slug}/og.svg`)).text();
    expect(svg).toContain('Copied by 4 people');
    expect(svg).not.toContain('Kept by');

    const renamed = await json<View>(await publish(env, maker, { products: [magnesium], stackName: 'Evening', listed: true }));
    expect(renamed.version).toBe(2);
    expect(renamed.changes).toEqual(['Renamed to Evening']);

    const stronger = { ...magnesium, servingsPerDay: 3 };
    const edited = await json<View>(await publish(env, maker, { products: [stronger], stackName: 'Evening', listed: true }));
    expect(edited.version).toBe(3);
    expect(edited.changes).toEqual(['Magnesium glycinate: 3 a day, was 2']);
    expect(edited.updatedOn).not.toBeNull();
    const row = sqlite.prepare('SELECT kept_count, material_version FROM shares WHERE slug = ?').get(share.slug) as {
      kept_count: number;
      material_version: number;
    };
    expect(row).toEqual({ kept_count: 4, material_version: 3 });
    expect((await json<View>(await request(env, `/v1/shares/${share.slug}`))).copyCount).toBe(4);

    const viewed = await json<View>(await request(env, `/v1/shares/${share.slug}`, { token: tokens[1] }));
    expect(viewed.viewer?.copied?.current).toBe(false);
    const restarted = await json<{ restarted: boolean }>(
      await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token: tokens[1], body: {} }),
    );
    expect(restarted.restarted).toBe(true);
    await scheduled(env);
    expect((await json<View>(await request(env, `/v1/shares/${share.slug}`))).copyCount).toBe(4);
  });
});

describe('copier results', () => {
  it('needs consent and a finished window, and checks every field', async () => {
    const { env, sqlite } = createTestEnv();
    const maker = await signIn(env, 'maker@example.com');
    const share = await json<View>(await publish(env, maker, { products: [magnesium] }));
    const token = await copier(env, sqlite, 'copier@example.com', { ageRange: '30_39', sex: 'female' });
    await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token, body: { outcomeConsent: false } });

    const body = { results: [restingResult] };
    const path = `/v1/shares/${share.slug}/outcome`;
    expect((await request(env, path, { method: 'POST', token, body })).status).toBe(403);

    await request(env, `/v1/shares/${share.slug}/outcome-consent`, { method: 'PUT', token, body: { consent: true } });
    const early = await request(env, path, { method: 'POST', token, body });
    expect(early.status).toBe(400);
    expect((await json<{ error: string }>(early)).error).toMatch(/^Results open on \d{4}-\d{2}-\d{2}\.$/);

    backdateCopies(sqlite, 100);
    expect((await request(env, path, { method: 'POST', token, body: { results: [{ ...restingResult, percent: -90 }] } })).status).toBe(400);
    expect((await request(env, path, { method: 'POST', token, body: { results: [restingResult, restingResult] } })).status).toBe(400);
    const saved = await request(env, path, { method: 'POST', token, body });
    expect(saved.status).toBe(200);
    const stored = sqlite.prepare('SELECT metric, percent_change, age_range, sex FROM copier_outcomes').all();
    expect(stored).toEqual([{ metric: 'resting_hr_bpm', percent_change: -6, age_range: '30_39', sex: 'female' }]);

    await request(env, `/v1/shares/${share.slug}/outcome-consent`, { method: 'PUT', token, body: { consent: false } });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM copier_outcomes').get()).toEqual({ n: 0 });
  });

  it('shows averages in the app only, in bands, with small and differencing slices hidden', async () => {
    const { env, sqlite } = createTestEnv();
    const maker = await signIn(env, 'maker@example.com');
    const share = await json<View>(await publish(env, maker, { products: [magnesium] }));
    const percents = [-4, -5, -6, -7, -8, -9, -6, -6, -7, -5, -12];
    const tokens: string[] = [];
    for (const [index, percent] of percents.entries()) {
      const sex = index === 10 ? 'male' : 'female';
      const token = await copier(env, sqlite, `c${index}@example.com`, { ageRange: '30_39', sex });
      await request(env, `/v1/shares/${share.slug}/copy`, { method: 'POST', token, body: { outcomeConsent: true } });
      backdateCopies(sqlite, 100);
      const result = { ...restingResult, percent, direction: 'down' };
      expect((await request(env, `/v1/shares/${share.slug}/outcome`, { method: 'POST', token, body: { results: [result] } })).status).toBe(200);
      tokens.push(token);
    }

    expect((await request(env, `/v1/shares/${share.slug}/cohorts`)).status).toBe(401);
    const today = await json<{ metrics: unknown[] }>(await request(env, `/v1/shares/${share.slug}/cohorts`, { token: tokens[0] }));
    expect(today.metrics).toEqual([]);

    sqlite.prepare('UPDATE copier_outcomes SET submitted_at = ?').run(new Date(Date.now() - 2 * 86_400_000).toISOString());
    sqlite.prepare('DELETE FROM share_cohort_cache').run();
    const report = await json<{ metrics: { slices: { key: string; line: string }[] }[]; disclaimer: string }>(
      await request(env, `/v1/shares/${share.slug}/cohorts`, { token: tokens[0] }),
    );
    const slices = report.metrics[0]?.slices ?? [];
    expect(slices.map((slice) => slice.key)).toEqual(['all']);
    expect(slices[0]?.line).toBe('Typical change in resting heart rate: down 5 to 10%, 10 to 19 people');
    expect(report.disclaimer).toMatch(/not a trial/);

    const html = await (await request(env, `/s/${share.slug}`)).text();
    expect(html).not.toContain('Typical change');
    expect(html).not.toContain('5 to 10%');
  });
});

describe('moderation', () => {
  it('hides a share after 3 reports until a moderator restores it', async () => {
    const { env, sqlite } = createTestEnv({ ADMIN_TOKEN: 'admin-secret-token' });
    const maker = await signIn(env, 'maker@example.com');
    const share = await json<View>(await publish(env, maker, { products: [magnesium], listed: true }));
    expect((await request(env, `/v1/shares/${share.slug}/report`, { method: 'POST', token: maker, body: { reason: 'spam' } })).status).toBe(400);

    for (let index = 0; index < 3; index += 1) {
      const token = await copier(env, sqlite, `r${index}@example.com`);
      expect((await request(env, `/v1/shares/${share.slug}/report`, { method: 'POST', token, body: { reason: 'nope' } })).status).toBe(400);
      const reported = await request(env, `/v1/shares/${share.slug}/report`, { method: 'POST', token, body: { reason: 'health_claim' } });
      expect(reported.status).toBe(200);
    }
    expect((await request(env, `/v1/shares/${share.slug}`)).status).toBe(404);
    expect((await request(env, `/s/${share.slug}`)).status).toBe(404);
    expect((await json<{ items: unknown[] }>(await request(env, '/v1/library'))).items).toHaveLength(0);
    const own = await json<{ share: { hidden: boolean } }>(await request(env, '/v1/shares/current', { token: maker }));
    expect(own.share.hidden).toBe(true);

    expect((await request(env, '/v1/admin/reports')).status).toBe(401);
    const queue = await json<{ queue: { slug: string; open_reports: number }[] }>(
      await request(env, '/v1/admin/reports', { token: 'admin-secret-token' }),
    );
    expect(queue.queue[0]).toMatchObject({ slug: share.slug, open_reports: 3 });
    await request(env, `/v1/admin/shares/${share.slug}`, { method: 'POST', token: 'admin-secret-token', body: { action: 'restore' } });
    expect((await request(env, `/v1/shares/${share.slug}`)).status).toBe(200);
    expect((await json<{ items: unknown[] }>(await request(env, '/v1/library'))).items).toHaveLength(1);
  });

  it('blocks a creator for the viewer', async () => {
    const { env, sqlite } = createTestEnv();
    const maker = await signIn(env, 'maker@example.com');
    const share = await json<View>(await publish(env, maker, { products: [magnesium], listed: true }));
    const viewer = await copier(env, sqlite, 'viewer@example.com');
    await request(env, `/v1/shares/${share.slug}/block`, { method: 'POST', token: viewer });
    expect((await json<{ items: unknown[] }>(await request(env, '/v1/library', { token: viewer }))).items).toHaveLength(0);
    expect((await json<{ items: unknown[] }>(await request(env, '/v1/library'))).items).toHaveLength(1);
    await request(env, '/v1/me/blocks', { method: 'DELETE', token: viewer });
    expect((await json<{ items: unknown[] }>(await request(env, '/v1/library', { token: viewer }))).items).toHaveLength(1);
  });
});

describe('unsharing', () => {
  it('revokes the link and deletes everything with the account', async () => {
    const { env, sqlite } = createTestEnv();
    const maker = await signIn(env, 'maker@example.com');
    const share = await json<View>(await publish(env, maker, { products: [magnesium], listed: true }));
    await request(env, '/v1/shares/current', { method: 'DELETE', token: maker });
    expect((await request(env, `/v1/shares/${share.slug}`)).status).toBe(404);
    await request(env, '/v1/account', { method: 'DELETE', token: maker });
    for (const table of ['shares', 'share_versions', 'share_search', 'users']) {
      expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    }
  });
});
