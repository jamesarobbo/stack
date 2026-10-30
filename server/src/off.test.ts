import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import app from './app';
import { mapOffProduct, OFF_ATTRIBUTION, offProductUrl, offUserAgent } from './off';

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/off/${name}`, import.meta.url), 'utf8'));
}

function dsldFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/dsld/${name}`, import.meta.url), 'utf8'));
}

function createTestEnv(options: {
  dsld?: (input: string, init?: RequestInit) => Promise<Response>;
  off?: (input: string, init?: RequestInit) => Promise<Response>;
  contact?: string;
}) {
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
      DSLD_FETCH: options.dsld,
      OFF_FETCH: options.off,
      CONTACT_EMAIL: options.contact,
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Open Food Facts mapping', () => {
  it('maps a per-serving gram amount and ignores per-100g copies', () => {
    const label = mapOffProduct(fixture('hydration.json'), '5060447850007');
    expect(label?.source).toBe('off');
    expect(label?.name).toBe('Hydration tablets');
    expect(label?.brand).toBe('Phizz');
    expect(label?.upc).toBe('5060447850007');
    expect(label?.servingSize).toBe('1 tablet (10 tablets)');
    expect(label?.servingsPerContainer).toBe(10);
    expect(label?.servingsCounted).toBe(true);
    expect(label?.ingredients).toEqual([
      { key: 'vitamin-d', name: 'Vitamin D', amount: 10, unit: 'mcg', costWeight: 1 },
      { key: 'magnesium', name: 'Magnesium', amount: 56, unit: 'mg', costWeight: 1 },
    ]);
  });

  it('does not treat a per-100g gram value as a dose', () => {
    const label = mapOffProduct(fixture('vitamin-d-no-serving.json'), '5059604469688');
    expect(label?.name).toBe('H&B Vitamin D3 400 I.U. (10µg)');
    expect(label?.brand).toBe('');
    expect(label?.servingSize).toBe('1 serving');
    expect(label?.servingsCounted).toBe(false);
    expect(label?.ingredients).toEqual([]);
  });

  it('does not read a dose out of the product name', () => {
    const label = mapOffProduct(fixture('name-dose-only.json'), '5021265247400');
    expect(label?.brand).toBe('Vitabiotics');
    expect(label?.servingSize).toBe('1 tablet');
    expect(label?.ingredients).toEqual([]);
  });

  it('keeps a gram serving and skips units that are not grams', () => {
    const label = mapOffProduct(fixture('ambiguous-unit.json'), '5000000000018');
    expect(label?.servingSize).toBe('8.6 g (10 tablets)');
    expect(label?.servingsCounted).toBe(false);
    expect(label?.ingredients).toEqual([{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg', costWeight: 1 }]);
  });

  it('returns nothing for a miss', () => {
    expect(mapOffProduct(fixture('not-found.json'), '5017174146699')).toBeNull();
  });
});

describe('Open Food Facts barcode route', () => {
  it('uses Open Food Facts after a DSLD miss, caches it apart from DSLD, and sends a User-Agent', async () => {
    const calls: { url: string; userAgent: string | null }[] = [];
    const { env, sqlite } = createTestEnv({
      contact: 'labels@example.com',
      dsld: async () => jsonResponse({ hits: [] }),
      off: async (url, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url, userAgent: headers.get('user-agent') });
        return jsonResponse(fixture('hydration.json'));
      },
    });
    const first = await app.request('/v1/labels/upc/5060447850007', {}, env);
    expect(first.status).toBe(200);
    const body = (await first.json()) as {
      found: boolean;
      attribution: string;
      label: { source: string; name: string; ingredients: { amount: number; unit: string }[] };
    };
    expect(body.found).toBe(true);
    expect(body.label.source).toBe('off');
    expect(body.label.name).toBe('Hydration tablets');
    expect(body.label.ingredients[0]).toMatchObject({ amount: 10, unit: 'mcg' });
    expect(body.attribution).toBe(OFF_ATTRIBUTION);
    expect(calls.map((call) => call.url)).toEqual([offProductUrl('5060447850007')]);
    expect(calls[0]?.userAgent).toBe(offUserAgent('labels@example.com'));
    expect(offUserAgent('labels@example.com')).toBe('Stack/0.1 (labels@example.com)');

    const offRows = sqlite.prepare('SELECT cache_key, payload FROM off_cache').all() as { cache_key: string; payload: string }[];
    expect(offRows.map((row) => row.cache_key)).toEqual(['off:5060447850007']);
    expect(offRows[0]?.payload).toContain('"source":"off"');
    const dsldRows = sqlite.prepare("SELECT cache_key FROM dsld_cache WHERE cache_key LIKE 'off:%'").all() as { cache_key: string }[];
    expect(dsldRows).toEqual([]);

    const again = await app.request('/v1/labels/upc/5060447850007', {}, env);
    expect(again.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it('does not call Open Food Facts when DSLD already matched', async () => {
    let offCalls = 0;
    const { env } = createTestEnv({
      dsld: async (url) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('/label/337582')) return jsonResponse(dsldFixture('label-337582.json'));
        if (decoded.includes('0 88395 05611 6')) return jsonResponse(dsldFixture('search-upc.json'));
        return jsonResponse({ hits: [] });
      },
      off: async () => {
        offCalls += 1;
        return jsonResponse(fixture('hydration.json'));
      },
    });
    const found = await app.request('/v1/labels/upc/088395056116', {}, env);
    const body = (await found.json()) as { found: boolean; attribution: string; label: { source: string } };
    expect(body.found).toBe(true);
    expect(body.label.source).toBe('dsld');
    expect(body.attribution).toContain('dsld.od.nih.gov');
    expect(body.attribution).not.toContain('ODbL');
    expect(offCalls).toBe(0);
  });

  it('falls through to not found when Open Food Facts misses, and caches that miss', async () => {
    let offCalls = 0;
    const { env } = createTestEnv({
      dsld: async () => jsonResponse({ hits: [] }),
      off: async () => {
        offCalls += 1;
        return jsonResponse(fixture('not-found.json'));
      },
    });
    const missed = await app.request('/v1/labels/upc/5017174146699', {}, env);
    expect(missed.status).toBe(200);
    expect(await missed.json()).toMatchObject({ found: false, upc: '5017174146699', label: null });
    expect(offCalls).toBe(1);
    const again = await app.request('/v1/labels/upc/5017174146699', {}, env);
    expect(again.status).toBe(200);
    expect(offCalls).toBe(1);
  });

  it('does not cache a timeout, then uses a later success', async () => {
    let offCalls = 0;
    const { env, sqlite } = createTestEnv({
      dsld: async () => jsonResponse({ hits: [] }),
      off: async () => {
        offCalls += 1;
        if (offCalls === 1) throw new Error('timeout');
        return jsonResponse(fixture('name-dose-only.json'));
      },
    });
    const first = await app.request('/v1/labels/upc/5021265247400', {}, env);
    expect(await first.json()).toMatchObject({ found: false, label: null });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM off_cache').get()).toEqual({ n: 0 });

    const second = await app.request('/v1/labels/upc/5021265247400', {}, env);
    const body = (await second.json()) as { found: boolean; label: { source: string; ingredients: unknown[] } };
    expect(body.found).toBe(true);
    expect(body.label.source).toBe('off');
    expect(body.label.ingredients).toEqual([]);
    expect(offCalls).toBe(2);
  });

  it('tries the leading-zero form and still returns not found on HTTP 404', async () => {
    const urls: string[] = [];
    const { env } = createTestEnv({
      dsld: async () => jsonResponse({ hits: [] }),
      off: async (url) => {
        urls.push(url);
        return jsonResponse({ error: 'missing' }, 404);
      },
    });
    const missed = await app.request('/v1/labels/upc/012345678905', {}, env);
    expect(await missed.json()).toMatchObject({ found: false });
    expect(urls).toEqual([offProductUrl('012345678905'), offProductUrl('0012345678905')]);
  });
});
