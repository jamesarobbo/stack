import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { createTestEnv, ensureUsername, json, request, signIn } from '../test/env';
import app from './app';
import { isReservedTestAddress, returnsDevCode, testEmails } from './auth';
import { sha256Hex } from './crypto';
import { intParam } from './library';
import { subscriptionFromEvent, subscriptionIsPro } from './revenuecat';

const magnesium = {
  id: 'p1',
  name: 'Magnesium glycinate',
  priceCents: 1800,
  servingsPerContainer: 30,
  servingsPerDay: 1,
  startDate: '2026-10-01',
  ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg', costWeight: 1 }],
};

describe('email auth and sync', () => {
  it('signs in with a code, syncs a stack, and rejects health payloads', async () => {
    const { env, sqlite } = createTestEnv();
    const start = await request(env, '/v1/auth/email/start', { method: 'POST', body: { email: 'Alex@Example.com' } });
    const started = await json<{ devCode: string }>(start);
    expect(start.status).toBe(200);
    expect(started.devCode).toMatch(/^\d{6}$/);

    const verified = await request(env, '/v1/auth/email/verify', {
      method: 'POST',
      body: { email: 'alex@example.com', code: started.devCode },
    });
    expect(verified.status).toBe(200);
    const session = await json<{ token: string; user: { email: string } }>(verified);
    expect(session.user.email).toBe('alex@example.com');

    expect((await request(env, '/v1/sync/stack')).status).toBe(401);
    const health = await request(env, '/v1/sync/stack', { method: 'PUT', token: session.token, body: { products: [], healthSamples: [] } });
    expect(health.status).toBe(400);

    const saved = await request(env, '/v1/sync/stack', { method: 'PUT', token: session.token, body: { products: [magnesium] } });
    expect(saved.status).toBe(200);
    const stack = await json<{ products: { name: string }[] }>(await request(env, '/v1/sync/stack', { token: session.token }));
    expect(stack.products[0]?.name).toBe('Magnesium glycinate');

    const removed = await request(env, '/v1/account', { method: 'DELETE', token: session.token });
    expect(removed.status).toBe(200);
    const users = sqlite.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    expect(users.n).toBe(0);
  });

  it('syncs a taken tick and drops it with the account', async () => {
    const { env, sqlite } = createTestEnv();
    const token = await signIn(env, 'taken@example.com');
    expect((await request(env, '/v1/sync/intake')).status).toBe(401);
    const saved = await request(env, '/v1/sync/intake', {
      method: 'PUT',
      token,
      body: { logs: [{ id: 'log-1', productId: 'mag', day: '2026-10-31', takenAt: '2026-10-31T08:00:00.000Z' }] },
    });
    expect(saved.status).toBe(200);
    const listed = await json<{ logs: { id: string; productId: string; day: string }[] }>(await request(env, '/v1/sync/intake', { token }));
    expect(listed.logs[0]).toMatchObject({ id: 'log-1', productId: 'mag', day: '2026-10-31' });
    const rejected = await request(env, '/v1/sync/intake', {
      method: 'PUT',
      token,
      body: { logs: [{ id: 'bad', productId: 'mag', day: 'yesterday', takenAt: '2026-10-31T08:00:00.000Z' }] },
    });
    expect(rejected.status).toBe(400);
    await request(env, '/v1/account', { method: 'DELETE', token });
    const left = sqlite.prepare('SELECT COUNT(*) AS n FROM intake_logs').get() as { n: number };
    expect(left.n).toBe(0);
  });

  it('never returns the code from a deployed Worker', async () => {
    const { env } = createTestEnv({ ENVIRONMENT: 'production' });
    const local = await json<{ devCode?: string }>(await request(env, '/v1/auth/email/start', { method: 'POST', body: { email: 'a@b.co' } }));
    expect(local.devCode).toBeUndefined();

    const dev = createTestEnv();
    const remote = await app.request(
      'https://stack-api.example.workers.dev/v1/auth/email/start',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co' }) },
      dev.env,
    );
    expect(((await remote.json()) as { devCode?: string }).devCode).toBeUndefined();
    expect(returnsDevCode('development', 'http://127.0.0.1:8787/v1/auth/email/start')).toBe(true);
    expect(returnsDevCode('development', 'http://192.168.1.4:8787/v1/auth/email/start')).toBe(false);
    expect(returnsDevCode(undefined, 'http://localhost/v1')).toBe(false);
  });

  it('lets listed test addresses on reserved domains sign in with the secret code', async () => {
    const { env } = createTestEnv({
      ENVIRONMENT: 'production',
      TEST_EMAILS: 'james@stack.test, someone@gmail.com',
      TEST_SIGN_IN_CODE: '482913',
    });
    expect(testEmails(env.TEST_EMAILS)).toEqual(['james@stack.test']);
    expect(isReservedTestAddress('reviewer@example.com')).toBe(true);
    expect(isReservedTestAddress('someone@gmail.com')).toBe(false);

    const started = await json<Record<string, unknown>>(
      await request(env, '/v1/auth/email/start', { method: 'POST', body: { email: 'james@stack.test' } }),
    );
    expect(started).toEqual({ ok: true });

    const wrong = await request(env, '/v1/auth/email/verify', { method: 'POST', body: { email: 'james@stack.test', code: '000000' } });
    expect(wrong.status).toBe(401);
    const right = await request(env, '/v1/auth/email/verify', { method: 'POST', body: { email: 'james@stack.test', code: '482913' } });
    expect(right.status).toBe(200);

    const real = await request(env, '/v1/auth/email/verify', { method: 'POST', body: { email: 'someone@gmail.com', code: '482913' } });
    expect(real.status).toBe(401);
  });

  it('limits code guesses per address', async () => {
    const { env } = createTestEnv();
    await request(env, '/v1/auth/email/start', { method: 'POST', body: { email: 'guess@example.com' } });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(env, '/v1/auth/email/verify', { method: 'POST', body: { email: 'guess@example.com', code: '111111' } });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('turns away the old sample upload endpoint', async () => {
    const { env } = createTestEnv();
    const response = await request(env, '/v1/outcomes/preview', { method: 'POST', body: { samples: [] } });
    expect(response.status).toBe(410);
  });
});

describe('query parsing', () => {
  it('falls back on junk numbers', () => {
    expect(intParam('abc', 20, 1, 50)).toBe(20);
    expect(intParam('NaN', 20, 1, 50)).toBe(20);
    expect(intParam('-3', 0, 0, 100)).toBe(0);
    expect(intParam('999', 20, 1, 50)).toBe(50);
    expect(intParam('7', 20, 1, 50)).toBe(7);
  });

  it('serves the library with a bad limit', async () => {
    const { env } = createTestEnv();
    const response = await request(env, '/v1/library?limit=abc&offset=xyz');
    expect(response.status).toBe(200);
  });
});

describe('links', () => {
  it('publishes apple-app-site-association only when configured', async () => {
    const bare = createTestEnv();
    expect((await request(bare.env, '/.well-known/apple-app-site-association')).status).toBe(404);
    const { env } = createTestEnv({ APPLE_TEAM_ID: 'ABCDE12345' });
    const body = await json<{ applinks: { details: { appIDs: string[]; components: { '/': string }[] }[] } }>(
      await request(env, '/.well-known/apple-app-site-association'),
    );
    expect(body.applinks.details[0]?.appIDs).toEqual(['ABCDE12345.app.stack.mobile']);
    expect(body.applinks.details[0]?.components[0]?.['/']).toBe('/s/*');
  });

  it('hands a pending link to the app opened from the same network', async () => {
    const { env } = createTestEnv();
    const token = await signIn(env, 'maker@example.com');
    await ensureUsername(env, token, 'maker_link');
    const share = await json<{ slug: string }>(
      await request(env, '/v1/shares', { method: 'POST', token, body: { products: [{ ...magnesium, brand: 'Acme' }] } }),
    );
    const get = await request(env, `/s/${share.slug}/get`, { ip: '203.0.113.9' });
    expect(get.status).toBe(302);
    expect(get.headers.get('location')).toBe(`stack://s/${share.slug}`);

    const claimed = await json<{ slug: string | null }>(await request(env, '/v1/links/claim', { method: 'POST', ip: '203.0.113.9' }));
    expect(claimed.slug).toBe(share.slug);
    const again = await json<{ slug: string | null }>(await request(env, '/v1/links/claim', { method: 'POST', ip: '203.0.113.9' }));
    expect(again.slug).toBeNull();
    const other = await json<{ slug: string | null }>(await request(env, '/v1/links/claim', { method: 'POST', ip: '198.51.100.2' }));
    expect(other.slug).toBeNull();
  });
});

describe('apple nonce', () => {
  it('accepts a token whose nonce claim is the SHA-256 hex of the raw nonce', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwk = await exportJWK(publicKey);
    const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test', alg: 'ES256', use: 'sig' }] });
    const rawNonce = 'raw-nonce-value';
    const token = await new SignJWT({ nonce: await sha256Hex(rawNonce), email: 'apple@example.com' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setIssuer('https://appleid.apple.com')
      .setAudience('app.stack.mobile')
      .setSubject('apple-sub-1')
      .setExpirationTime('2h')
      .sign(privateKey);

    const { env } = createTestEnv();
    const { verifyAppleIdentityToken } = await import('./apple');
    const identity = await verifyAppleIdentityToken(token, rawNonce, { audience: 'app.stack.mobile', jwks });
    expect(identity.sub).toBe('apple-sub-1');
    await expect(verifyAppleIdentityToken(token, 'other-nonce', { audience: 'app.stack.mobile', jwks })).rejects.toThrow(/nonce/i);

    const response = await request(env, '/v1/auth/apple', { method: 'POST', body: { identityToken: token, rawNonce } });
    expect(response.status).toBe(401);
  });
});

describe('revenuecat webhook', () => {
  it('stores an active pro entitlement and rejects a bad secret', async () => {
    const { env, sqlite } = createTestEnv();
    const event = { type: 'INITIAL_PURCHASE', app_user_id: 'user_1', entitlement_ids: ['pro'] };
    const bad = await app.request(
      '/v1/webhooks/revenuecat',
      { method: 'POST', headers: { authorization: 'Bearer nope', 'content-type': 'application/json' }, body: JSON.stringify({ event }) },
      env,
    );
    expect(bad.status).toBe(401);

    const ok = await app.request(
      '/v1/webhooks/revenuecat',
      {
        method: 'POST',
        headers: { authorization: 'Bearer whsec-test', 'content-type': 'application/json' },
        body: JSON.stringify({
          event: { ...event, product_id: 'stack_pro_annual', expiration_at_ms: Date.now() + 86_400_000, store: 'APP_STORE' },
        }),
      },
      env,
    );
    expect(ok.status).toBe(200);
    const row = sqlite.prepare('SELECT status, entitlement, expires_at FROM subscriptions WHERE user_id = ?').get('user_1') as {
      status: string;
      entitlement: string;
      expires_at: string;
    };
    expect(row.entitlement).toBe('pro');
    expect(subscriptionIsPro(row)).toBe(true);
    expect(subscriptionFromEvent({ type: 'EXPIRATION', app_user_id: 'user_1', entitlement_ids: ['pro'] })?.status).toBe('expired');
  });
});
