import { describe, expect, it } from 'vitest';
import { auditScoreParts, type ScoreProduct } from './auditScore';

function bottle(id: string, ingredients: { key: string; amount: number; unit?: string }[], servingsPerDay = 1): ScoreProduct {
  return {
    id,
    servingsPerDay,
    ingredients: ingredients.map((ingredient) => ({ key: ingredient.key, amount: ingredient.amount, unit: ingredient.unit ?? 'mg' })),
  };
}

describe('audit score', () => {
  it('starts at 100 when nothing overlaps or exceeds a limit', () => {
    expect(auditScoreParts([]).score).toBe(100);
    expect(auditScoreParts([bottle('a', [{ key: 'magnesium', amount: 200 }])]).score).toBe(100);
  });

  it('penalises duplicate ingredients and redundant products without using price', () => {
    expect(
      auditScoreParts([
        bottle('a', [{ key: 'magnesium', amount: 100 }]),
        bottle('b', [{ key: 'magnesium', amount: 100 }]),
      ]),
    ).toEqual({ score: 58, duplicate: 12, limits: 0, redundant: 30 });
  });

  it('flags a dose above the upper limit and a dose in the near band', () => {
    expect(auditScoreParts([bottle('a', [{ key: 'zinc', amount: 50 }])]).score).toBe(80);
    expect(auditScoreParts([bottle('a', [{ key: 'zinc', amount: 36 }])]).score).toBe(92);
  });

  it('converts vitamin D micrograms into the IU limit', () => {
    expect(auditScoreParts([bottle('a', [{ key: 'vitamin-d', amount: 100, unit: 'mcg' }])]).limits).toBe(8);
    expect(auditScoreParts([bottle('a', [{ key: 'vitamin-d', amount: 101, unit: 'mcg' }])]).limits).toBe(20);
  });

  it('keeps a product that still has a unique ingredient', () => {
    expect(
      auditScoreParts([
        bottle('a', [
          { key: 'magnesium', amount: 200 },
          { key: 'vitamin-c', amount: 100 },
        ]),
        bottle('b', [{ key: 'magnesium', amount: 100 }]),
      ]),
    ).toEqual({ score: 73, duplicate: 12, limits: 0, redundant: 15 });
  });
});
