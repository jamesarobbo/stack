import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays } from '../../../shared/outcome';
import type { SampleInput } from '../domain/types';

const settings = new Map<string, string>();
const calls: { path: string; method?: string; body?: unknown }[] = [];
let copies: unknown[] = [];

vi.mock('../settings', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: async (key: string, value: string) => {
    settings.set(key, value);
  },
}));

vi.mock('../api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
  api: async (path: string, options: { method?: string; body?: unknown } = {}) => {
    calls.push({ path, method: options.method, body: options.body });
    if (path === '/v1/me/copies') return { copies };
    return { saved: 1 };
  },
}));

const { flushPendingCopies, recordCopy, sharePayloadProducts, submitCopierResults } = await import('./sharing');

const COPIED = '2026-01-05';
const TODAY = addDays(COPIED, 110);

function restingHeartRate(): SampleInput[] {
  const before = Array.from({ length: 300 }, (_, index) => ({
    metric: 'resting_hr_bpm' as const,
    date: addDays(COPIED, index - 300),
    value: index % 2 ? 61 : 59,
  }));
  const after = Array.from({ length: 110 }, (_, index) => ({ metric: 'resting_hr_bpm' as const, date: addDays(COPIED, index), value: 56 }));
  return [...before, ...after];
}

beforeEach(() => {
  settings.clear();
  calls.length = 0;
  settings.set('healthSource', 'healthkit');
  settings.set('healthDevice', 'Apple Watch');
  copies = [
    { slug: 'a'.repeat(32), stackName: 'Sleep', copiedOn: COPIED, outcomeConsent: true, resultsSent: false, readyOn: addDays(COPIED, 97) },
    { slug: 'b'.repeat(32), stackName: 'No consent', copiedOn: COPIED, outcomeConsent: false, resultsSent: false, readyOn: addDays(COPIED, 97) },
    { slug: 'c'.repeat(32), stackName: 'Not ready', copiedOn: TODAY, outcomeConsent: true, resultsSent: false, readyOn: addDays(TODAY, 97) },
  ];
});

describe('copier results', () => {
  it('posts derived fields only, for consented copies whose window has closed', async () => {
    const sent = await submitCopierResults('token', restingHeartRate(), TODAY);
    expect(sent).toBe(1);
    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts.map((call) => call.path)).toEqual([`/v1/shares/${'a'.repeat(32)}/outcome`]);
    const body = posts[0]?.body as { results: Record<string, unknown>[] };
    expect(body.results).toEqual([
      { metric: 'resting_hr_bpm', direction: 'down', percent: -7, withinNormal: false, windowDays: 84, device: 'Apple Watch' },
    ]);
    expect(JSON.stringify(body)).not.toContain('date');
  });

  it('checks at most once a day and never without Apple Health', async () => {
    await submitCopierResults('token', restingHeartRate(), TODAY);
    calls.length = 0;
    expect(await submitCopierResults('token', restingHeartRate(), TODAY)).toBe(0);
    expect(calls).toEqual([]);
    settings.set('healthSource', '');
    expect(await submitCopierResults('token', restingHeartRate(), addDays(TODAY, 1))).toBe(0);
    expect(calls).toEqual([]);
  });
});

describe('copies before sign-in', () => {
  it('queues the copy and sends it once the products are still there', async () => {
    const slug = 'd'.repeat(32);
    expect(await recordCopy(null, { slug, outcomeConsent: true })).toBe(false);
    expect(calls).toEqual([]);
    await flushPendingCopies('token', []);
    expect(calls).toEqual([]);
    const product = { id: 'p', name: 'Zinc', brand: null, note: null, priceCents: 0, servingsPerContainer: 30, servingsPerDay: 1, startDate: TODAY, catalogueId: `share:${slug}`, ingredients: [] };
    await recordCopy(null, { slug, outcomeConsent: true });
    await flushPendingCopies('token', [product]);
    expect(calls).toEqual([{ path: `/v1/shares/${slug}/copy`, method: 'POST', body: { outcomeConsent: true } }]);
    expect(settings.get('pendingCopies')).toBe('[]');
  });
});

describe('share payload', () => {
  it('leaves prices, notes, and start dates on the phone', () => {
    const [product] = sharePayloadProducts([
      {
        id: 'p',
        name: 'Zinc',
        brand: 'Acme',
        note: 'Private note',
        priceCents: 1299,
        servingsPerContainer: 60,
        servingsPerDay: 1,
        startDate: '2026-01-01',
        catalogueId: 'off:0123',
        ingredients: [{ key: 'zinc', name: 'Zinc', amount: 15, unit: 'mg', costWeight: 1 }],
      },
    ]);
    expect(product).toEqual({
      id: 'p',
      name: 'Zinc',
      brand: 'Acme',
      servingsPerContainer: 60,
      servingsPerDay: 1,
      source: 'off',
      ingredients: [{ key: 'zinc', name: 'Zinc', amount: 15, unit: 'mg' }],
    });
  });
});
