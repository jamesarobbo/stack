import { describe, expect, it } from 'vitest';
import { applyPlan, copiedFrom, copiedProducts, isOpenFoodFactsProduct, planMerge, scoreAfter, shareCatalogueId, type SharedProduct } from './merge';
import type { ProductInput } from './types';

function mine(id: string, name: string, key: string, amount: number, brand: string | null = null, catalogueId: string | null = null): ProductInput {
  return {
    id,
    name,
    brand,
    note: null,
    priceCents: 1500,
    servingsPerContainer: 30,
    servingsPerDay: 1,
    startDate: '2026-09-01',
    catalogueId,
    ingredients: [{ key, name: key, amount, unit: 'mg', costWeight: 1 }],
  };
}

function shared(id: string, name: string, brand: string, key: string, amount: number): SharedProduct {
  return { id, name, brand, servingsPerContainer: 60, servingsPerDay: 1, ingredients: [{ key, name: key, amount, unit: 'mg' }] };
}

describe('merge preview', () => {
  const current = [mine('m1', 'Magnesium glycinate', 'magnesium', 200, 'Acme'), mine('m2', 'Zinc', 'zinc', 30)];
  const incoming = [
    shared('a', 'Magnesium glycinate', 'Acme', 'magnesium', 200),
    shared('b', 'Zinc picolinate', 'Other', 'zinc', 25),
    shared('c', 'Glycine', 'Other', 'glycine', 3000),
  ];

  it('marks products you already take, overlaps, and new ones', () => {
    const rows = planMerge(current, incoming);
    expect(rows.map((row) => [row.status, row.choice])).toEqual([
      ['same', 'skip'],
      ['overlap', 'add'],
      ['new', 'add'],
    ]);
    expect(rows[1]?.mine).toEqual([{ id: 'm2', name: 'Zinc' }]);
  });

  it('shows the score after the chosen rows', () => {
    const rows = planMerge(current, incoming);
    expect(scoreAfter(current, rows)).toEqual({ before: 100, after: 80, summary: '1 above the upper limit' });
    const replaced = rows.map((row) => (row.status === 'overlap' ? { ...row, choice: 'replace' as const } : row));
    expect(scoreAfter(current, replaced).after).toBe(100);
    expect(applyPlan(replaced)).toEqual({ add: [incoming[1], incoming[2]], replaceIds: ['m2'] });
  });

  it('finds the products copied from a share', () => {
    const list = [...current, mine('c1', 'Glycine', 'glycine', 3000, null, 'share:abc')];
    expect(copiedProducts(list, 'abc').map((item) => item.id)).toEqual(['c1']);
  });

  it('keeps Open Food Facts provenance on copied products', () => {
    expect(shareCatalogueId('abc', true)).toBe('share:abc:off');
    expect(copiedFrom('share:abc:off')).toBe('abc');
    expect(copiedFrom('off:123')).toBeNull();
    expect(isOpenFoodFactsProduct('share:abc:off')).toBe(true);
    expect(isOpenFoodFactsProduct('share:abc')).toBe(false);
    expect(isOpenFoodFactsProduct('off:0123')).toBe(true);
    const list = [mine('c2', 'Zinc', 'zinc', 15, null, 'share:abc:off')];
    expect(copiedProducts(list, 'abc').map((item) => item.id)).toEqual(['c2']);
  });
});
