import { describe, expect, it } from 'vitest';
import { buildExample } from '../data/example';
import {
  auditStack,
  formatWasted,
  monthlyCostCents,
  productWastedCents,
  savingsScore,
  toCanonical,
} from './audit';

const TODAY = '2026-10-30';

describe('monthly cost', () => {
  it('scales a bottle price by servings and days', () => {
    expect(monthlyCostCents(3000, 30, 1)).toBe(3000);
    expect(monthlyCostCents(3000, 60, 1)).toBe(1500);
    expect(monthlyCostCents(3000, 30, 2)).toBe(6000);
  });

  it('returns 0 when the label is incomplete', () => {
    expect(monthlyCostCents(3000, 0, 1)).toBe(0);
    expect(monthlyCostCents(0, 30, 1)).toBe(0);
  });
});

describe('unit conversion', () => {
  it('converts vitamin D micrograms to IU', () => {
    expect(toCanonical('vitamin-d', 100, 'mcg')).toEqual({ amount: 4000, unit: 'iu' });
    expect(toCanonical('vitamin-d', 4000, 'IU')).toEqual({ amount: 4000, unit: 'iu' });
  });

  it('ignores empty amounts', () => {
    expect(toCanonical('magnesium', 0, 'mg')).toBeNull();
  });
});

describe('example stack audit', () => {
  const result = auditStack(buildExample(TODAY).products);

  it('sums monthly spend from the six example products', () => {
    expect(result.monthlySpendCents).toBe(17500);
  });

  it('flags magnesium and B vitamins with the example overlap dollars', () => {
    expect(result.wastedCents).toBe(2700);
    expect(result.duplicates.map((finding) => finding.family)).toEqual(['magnesium', 'b-complex']);
    const magnesium = result.duplicates.find((finding) => finding.family === 'magnesium');
    const bComplex = result.duplicates.find((finding) => finding.family === 'b-complex');
    expect(magnesium?.wastedCents).toBe(1200);
    expect(magnesium?.detail).toBe('Glycinate 200 mg + Multi ~50 mg');
    expect(bComplex?.wastedCents).toBe(1500);
    expect(bComplex?.detail).toBe('Multi + TMG blend overlap');
    expect(formatWasted(1200)).toBe('~$12/mo');
  });

  it('soft-flags vitamin D at the published UL and leaves magnesium under it', () => {
    expect(result.limits.map((finding) => finding.key)).toEqual(['vitamin-d']);
    const vitaminD = result.limits[0];
    expect(vitaminD?.level).toBe('near');
    expect(vitaminD?.total).toBe(4000);
    expect(vitaminD?.message).toContain('near the NIH ODS upper limit');
    expect(vitaminD?.message).toContain('Not a dosing recommendation');
    expect(vitaminD?.sourceUrl).toContain('ods.od.nih.gov');
  });

  it('shows the resveratrol note and no disease-treatment language', () => {
    expect(result.interactions.map((note) => note.id)).toEqual(['resveratrol-anticoagulants']);
    const message = result.interactions[0]?.message ?? '';
    expect(message).toContain('Not a dosing recommendation');
    expect(message.toLowerCase()).not.toContain('treats');
    expect(message.toLowerCase()).not.toContain('cures');
  });

  it('describes the overlap in plain language', () => {
    expect(result.subtitle).toBe(
      'Magnesium and B vitamins appear in more than one bottle. Example estimate only.',
    );
  });
});

describe('upper limit edges', () => {
  it('flags zinc over the UL and stays quiet under the near threshold', () => {
    const over = auditStack([
      {
        id: 'z',
        name: 'Zinc',
        brand: null,
        note: null,
        priceCents: 900,
        servingsPerContainer: 30,
        servingsPerDay: 1,
        startDate: TODAY,
        ingredients: [{ key: 'zinc', name: 'Zinc', amount: 50, unit: 'mg', costWeight: 1 }],
      },
    ]);
    expect(over.limits[0]?.level).toBe('over');

    const under = auditStack([
      {
        id: 'z2',
        name: 'Zinc',
        brand: null,
        note: null,
        priceCents: 900,
        servingsPerContainer: 30,
        servingsPerDay: 1,
        startDate: TODAY,
        ingredients: [{ key: 'zinc', name: 'Zinc', amount: 15, unit: 'mg', costWeight: 1 }],
      },
    ]);
    expect(under.limits).toHaveLength(0);
  });

  it('sums the same nutrient across bottles before comparing with the UL', () => {
    const result = auditStack([
      bottle('a', 20),
      bottle('b', 25),
    ]);
    expect(result.limits.find((finding) => finding.key === 'zinc')?.total).toBe(45);
    expect(result.limits.find((finding) => finding.key === 'zinc')?.level).toBe('over');
  });
});

describe('savings score', () => {
  it('is 100 when nothing overlaps and lower when spend is duplicated', () => {
    expect(savingsScore(10000, 0)).toBe(100);
    expect(savingsScore(17500, 2700)).toBe(85);
    expect(savingsScore(0, 0)).toBe(100);
  });
});

describe('product waste', () => {
  it('assigns the smaller share to that product', () => {
    const example = buildExample(TODAY);
    const result = auditStack(example.products);
    expect(productWastedCents('example-multi', result)).toBe(1200);
    expect(productWastedCents('example-tmg', result)).toBe(1500);
    expect(productWastedCents('example-magnesium', result)).toBe(0);
  });
});

function bottle(id: string, amount: number) {
  return {
    id,
    name: id,
    brand: null,
    note: null,
    priceCents: 1000,
    servingsPerContainer: 30,
    servingsPerDay: 1,
    startDate: TODAY,
    ingredients: [{ key: 'zinc', name: 'Zinc', amount, unit: 'mg', costWeight: 1 }],
  };
}
