import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import app from './app';
import { sha256Hex } from './crypto';
import { subscriptionFromEvent, subscriptionIsPro } from './revenuecat';

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

describe('email auth and sync', () => {
  it('signs in with a code, syncs a stack, and rejects health payloads', async () => {
    const { env, sqlite } = createTestEnv();
    const start = await app.request(
      '/v1/auth/email/start',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'Alex@Example.com' }) },
      env,
    );
    const started = (await start.json()) as { devCode: string };
    expect(start.status).toBe(200);
    expect(started.devCode).toMatch(/^\d{6}$/);

    const verified = await app.request(
      '/v1/auth/email/verify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'alex@example.com', code: started.devCode }),
      },
      env,
    );
    expect(verified.status).toBe(200);
    const session = (await verified.json()) as { token: string; user: { email: string } };
    expect(session.user.email).toBe('alex@example.com');

    const denied = await app.request('/v1/sync/stack', { method: 'GET' }, env);
    expect(denied.status).toBe(401);

    const auth = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
    const health = await app.request(
      '/v1/sync/stack',
      { method: 'PUT', headers: auth, body: JSON.stringify({ products: [], healthSamples: [] }) },
      env,
    );
    expect(health.status).toBe(400);

    const saved = await app.request(
      '/v1/sync/stack',
      {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({
          products: [
            {
              id: 'p1',
              name: 'Magnesium glycinate',
              priceCents: 1800,
              servingsPerContainer: 30,
              servingsPerDay: 1,
              startDate: '2026-10-01',
              ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg', costWeight: 1 }],
            },
          ],
        }),
      },
      env,
    );
    expect(saved.status).toBe(200);
    const loaded = await app.request('/v1/sync/stack', { headers: auth }, env);
    const stack = (await loaded.json()) as { products: { name: string }[] };
    expect(stack.products[0]?.name).toBe('Magnesium glycinate');

    const removed = await app.request('/v1/account', { method: 'DELETE', headers: auth }, env);
    expect(removed.status).toBe(200);
    const users = sqlite.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    expect(users.n).toBe(0);
  });

  it('hides the code in production', async () => {
    const { env } = createTestEnv();
    const response = await app.request(
      '/v1/auth/email/start',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co' }) },
      { ...env, ENVIRONMENT: 'production' },
    );
    const body = (await response.json()) as { devCode?: string };
    expect(body.devCode).toBeUndefined();
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

    const response = await app.request(
      '/v1/auth/apple',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identityToken: token, rawNonce }),
      },
      env,
    );
    expect(response.status).toBe(401);
  });
});

describe('revenuecat webhook', () => {
  it('stores an active pro entitlement and rejects a bad secret', async () => {
    const { env, sqlite } = createTestEnv();
    const bad = await app.request(
      '/v1/webhooks/revenuecat',
      {
        method: 'POST',
        headers: { authorization: 'Bearer nope', 'content-type': 'application/json' },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user_1', entitlement_ids: ['pro'] } }),
      },
      env,
    );
    expect(bad.status).toBe(401);

    const ok = await app.request(
      '/v1/webhooks/revenuecat',
      {
        method: 'POST',
        headers: { authorization: 'Bearer whsec-test', 'content-type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'INITIAL_PURCHASE',
            app_user_id: 'user_1',
            entitlement_ids: ['pro'],
            product_id: 'stack_pro_annual',
            expiration_at_ms: Date.now() + 86_400_000,
            store: 'APP_STORE',
          },
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
