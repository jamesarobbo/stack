import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import app from './app';
import { DSLD_HOURLY_CAP, hourKey, mapDose, normaliseLabel, upcLookupQueries, upcMatches } from './dsld';

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/dsld/${name}`, import.meta.url), 'utf8'));
}

function createTestEnv(fetcher?: (input: string, init?: RequestInit) => Promise<Response>) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../migrations/0002_labels.sql', import.meta.url), 'utf8'));
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
      DSLD_FETCH: fetcher,
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('DSLD label normalisation', () => {
  it('maps magnesium milligrams and keeps the spaced UPC as digits', () => {
    const label = normaliseLabel(fixture('label-337582.json'));
    expect(label?.name).toBe('Chelated Magnesium Glycinate 200 mg');
    expect(label?.brand).toBe('Carlson');
    expect(label?.upc).toBe('088395056116');
    expect(label?.servingSize).toBe('1 Tablet');
    expect(label?.servingsPerContainer).toBe(90);
    expect(label?.servingsCounted).toBe(true);
    expect(label?.ingredients).toEqual([
      {
        key: 'magnesium',
        name: 'Magnesium (Magnesium Glycinate Chelate)',
        amount: 200,
        unit: 'mg',
        costWeight: 1,
      },
    ]);
  });

  it('keeps vitamin D in IU and counts softgels when servings are missing', () => {
    const label = normaliseLabel(fixture('label-62813.json'));
    expect(label?.servingSize).toBe('1 Softgel');
    expect(label?.servingsPerContainer).toBe(250);
    expect(label?.servingsCounted).toBe(true);
    expect(label?.ingredients).toEqual([
      expect.objectContaining({ key: 'vitamin-d', amount: 2000, unit: 'IU' }),
    ]);
  });

  it('keeps folate as mcg DFE and does not add the nested folic acid row', () => {
    const label = normaliseLabel(fixture('label-213414.json'));
    expect(label?.ingredients).toEqual([
      expect.objectContaining({ key: 'folate', name: 'Folate', amount: 800, unit: 'mcg DFE' }),
    ]);
    expect(label?.servingsPerContainer).toBe(100);
  });

  it('reads billion CFU from the ingredient note and skips nutrition facts', () => {
    const label = normaliseLabel(fixture('label-313383.json'));
    expect(label?.servingSize).toBe('2 Gummies');
    expect(label?.ingredients.map((item) => item.name)).toEqual(['Bacillus coagulans']);
    expect(label?.ingredients[0]).toMatchObject({ amount: 2, unit: 'CFU (billion)' });
  });

  it('uses the structured milligram amount when the bottle name says IU', () => {
    const label = normaliseLabel(fixture('label-306412.json'));
    expect(label?.name).toBe('Vitamin E 400 IU');
    expect(label?.ingredients[0]).toMatchObject({
      key: 'vitamin-e',
      amount: 268,
      unit: 'mg',
      name: 'Vitamin E (DL-Alpha-Tocopheryl Acetate)',
    });
    expect(label?.servingsPerContainer).toBe(240);
  });

  it('maps the rest of the dropdown units', () => {
    expect(mapDose(1.5, 'Gram(s)', '')).toEqual({ amount: 1.5, unit: 'g' });
    expect(mapDose(900, 'mcg RAE', '')).toEqual({ amount: 900, unit: 'mcg RAE' });
    expect(mapDose(20, 'mg NE', '')).toEqual({ amount: 20, unit: 'mg NE' });
    expect(mapDose(5, 'mL', '')).toEqual({ amount: 5, unit: 'mL' });
    expect(mapDose(2_000_000_000, 'CFU', '')).toEqual({ amount: 2, unit: 'CFU (billion)' });
    expect(mapDose(0, 'NP', 'Probiotic, 2 billion CFU')).toEqual({ amount: 2, unit: 'CFU (billion)' });
    expect(mapDose(1, 'Tablet(s)', '')).toBeNull();
  });

  it('builds the spaced UPC-A query DSLD actually matches', () => {
    expect(upcLookupQueries('088395056116')[0]).toBe('0 88395 05611 6');
    expect(upcLookupQueries('0088395056116')[0]).toBe('0 88395 05611 6');
    expect(upcMatches('0 88395 05611 6', '0088395056116')).toBe(true);
    expect(upcMatches('', '088395056116')).toBe(false);
  });
});

describe('label routes', () => {
  it('searches through the worker and caches the normalised hits', async () => {
    const calls: string[] = [];
    const { env } = createTestEnv(async (url) => {
      calls.push(url);
      return jsonResponse(fixture('search-magnesium.json'));
    });
    const first = await app.request('/v1/labels/search?q=magnesium%20glycinate', {}, env);
    expect(first.status).toBe(200);
    const body = (await first.json()) as { hits: { brand: string; name: string; keyIngredients: string[] }[]; attribution: string };
    expect(body.hits[0]?.brand).toBe("Vinco's");
    expect(body.hits[0]?.name).toBe('Magnesium Glycinate');
    expect(body.hits[0]?.keyIngredients).toContain('Magnesium');
    expect(body.hits[1]?.keyIngredients).toEqual(['Vitamin C', 'Magnesium']);
    expect(body.attribution).toContain('dsld.od.nih.gov');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('api.ods.od.nih.gov');
    expect(calls[0]).not.toContain('status=2');

    const second = await app.request('/v1/labels/search?q=magnesium%20glycinate', {}, env);
    expect(second.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it('looks up a UPC from the spaced DSLD form and caches a miss', async () => {
    const calls: string[] = [];
    const { env } = createTestEnv(async (url) => {
      calls.push(url);
      const decoded = decodeURIComponent(url);
      if (decoded.includes('/label/337582')) return jsonResponse(fixture('label-337582.json'));
      if (decoded.includes('0 88395 05611 6')) return jsonResponse(fixture('search-upc.json'));
      if (decoded.includes('search-filter')) return jsonResponse({ hits: [] });
      return jsonResponse({ error: 'missing' }, 404);
    });
    const found = await app.request('/v1/labels/upc/088395056116', {}, env);
    expect(found.status).toBe(200);
    const body = (await found.json()) as { found: boolean; label: { name: string; ingredients: { unit: string; amount: number }[] } };
    expect(body.found).toBe(true);
    expect(body.label.name).toContain('Magnesium');
    expect(body.label.ingredients[0]).toMatchObject({ amount: 200, unit: 'mg' });
    const afterFound = calls.length;

    const missed = await app.request('/v1/labels/upc/012345678905', {}, env);
    expect(missed.status).toBe(200);
    expect(await missed.json()).toMatchObject({ found: false, upc: '012345678905' });
    const afterMiss = calls.length;
    expect(afterMiss).toBeGreaterThan(afterFound);

    const again = await app.request('/v1/labels/upc/012345678905', {}, env);
    expect(again.status).toBe(200);
    expect(calls).toHaveLength(afterMiss);
  });

  it('stores a user product by UPC and returns it before DSLD', async () => {
    let upstream = 0;
    const { env } = createTestEnv(async () => {
      upstream += 1;
      return jsonResponse({ hits: [] });
    });
    const start = await app.request(
      '/v1/auth/email/start',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@example.com' }) },
      env,
    );
    const started = (await start.json()) as { devCode: string };
    const verified = await app.request(
      '/v1/auth/email/verify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'a@example.com', code: started.devCode }),
      },
      env,
    );
    const session = (await verified.json()) as { token: string };
    const auth = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
    const denied = await app.request('/v1/labels/upc/012345678905', { method: 'PUT', body: JSON.stringify({ name: 'X' }) }, env);
    expect(denied.status).toBe(401);

    const saved = await app.request(
      '/v1/labels/upc/012345678905',
      {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({
          name: 'Shop brand magnesium',
          brand: 'Corner store',
          upc: '012345678905',
          servingsPerContainer: 60,
          servingsPerDay: 1,
          ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg' }],
        }),
      },
      env,
    );
    expect(saved.status).toBe(200);
    const lookup = await app.request('/v1/labels/upc/012345678905', { headers: { authorization: `Bearer ${session.token}` } }, env);
    const body = (await lookup.json()) as { found: boolean; label: { source: string; name: string } };
    expect(body.found).toBe(true);
    expect(body.label.source).toBe('user');
    expect(body.label.name).toBe('Shop brand magnesium');
    expect(upstream).toBe(0);

    const badUnit = await app.request(
      '/v1/labels/upc/012345678905',
      {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({
          name: 'Shop brand magnesium',
          servingsPerContainer: 60,
          servingsPerDay: 1,
          ingredients: [{ name: 'Magnesium', amount: 200, unit: 'tablets' }],
        }),
      },
      env,
    );
    expect(badUnit.status).toBe(400);
  });

  it('stops calling NIH once the hourly cap is reached', async () => {
    let upstream = 0;
    const { env, sqlite } = createTestEnv(async () => {
      upstream += 1;
      return jsonResponse(fixture('search-magnesium.json'));
    });
    sqlite.prepare('INSERT INTO dsld_budget (hour_key, requests) VALUES (?, ?)').run(hourKey(), DSLD_HOURLY_CAP);
    const response = await app.request('/v1/labels/search?q=magnesium', {}, env);
    expect(response.status).toBe(503);
    expect(upstream).toBe(0);
  });
});
