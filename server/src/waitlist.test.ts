import { describe, expect, it } from 'vitest';
import { createTestEnv, json, request } from '../test/env';

describe('waitlist', () => {
  it('stores a valid email once and dedupes case', async () => {
    const { env, sqlite } = createTestEnv();
    const first = await request(env, '/v1/waitlist', {
      method: 'POST',
      body: { email: 'Alex@Example.com', source: 'landing', utm_source: 'x', utm_medium: 'social', utm_campaign: 'wait' },
    });
    expect(first.status).toBe(200);
    expect(await json(first)).toEqual({ ok: true, status: 'created' });

    const again = await request(env, '/v1/waitlist', {
      method: 'POST',
      body: { email: 'alex@example.com', source: 'landing' },
    });
    expect(again.status).toBe(200);
    expect(await json(again)).toEqual({ ok: true, status: 'exists' });

    const rows = sqlite.prepare('SELECT email, source, utm_source, utm_medium, utm_campaign FROM waitlist').all() as {
      email: string;
      source: string;
      utm_source: string;
      utm_medium: string;
      utm_campaign: string;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: 'alex@example.com',
      source: 'landing',
      utm_source: 'x',
      utm_medium: 'social',
      utm_campaign: 'wait',
    });
  });

  it('rejects a bad email and ignores honeypot fills', async () => {
    const { env, sqlite } = createTestEnv();
    const bad = await request(env, '/v1/waitlist', { method: 'POST', body: { email: 'not-an-email' } });
    expect(bad.status).toBe(400);

    const bait = await request(env, '/v1/waitlist', {
      method: 'POST',
      body: { email: 'bot@example.com', company: 'Acme Corp' },
    });
    expect(bait.status).toBe(200);
    expect(await json(bait)).toEqual({ ok: true });
    const n = sqlite.prepare('SELECT COUNT(*) AS n FROM waitlist').get() as { n: number };
    expect(n.n).toBe(0);
  });

  it('rate limits repeated posts from one address', async () => {
    const { env } = createTestEnv();
    const ip = '203.0.113.9';
    for (let i = 0; i < 8; i += 1) {
      const res = await request(env, '/v1/waitlist', {
        method: 'POST',
        ip,
        body: { email: `person${i}@example.com` },
      });
      expect(res.status).toBe(200);
    }
    const blocked = await request(env, '/v1/waitlist', {
      method: 'POST',
      ip,
      body: { email: 'extra@example.com' },
    });
    expect(blocked.status).toBe(429);
  });

  it('returns the admin count behind ADMIN_TOKEN', async () => {
    const { env } = createTestEnv({ ADMIN_TOKEN: 'admin-secret-token' });
    await request(env, '/v1/waitlist', { method: 'POST', body: { email: 'one@example.com' } });
    await request(env, '/v1/waitlist', { method: 'POST', body: { email: 'two@example.com' } });
    expect((await request(env, '/v1/admin/waitlist/count')).status).toBe(401);
    const ok = await request(env, '/v1/admin/waitlist/count', { token: 'admin-secret-token' });
    expect(ok.status).toBe(200);
    expect(await json(ok)).toEqual({ count: 2 });
  });
});
