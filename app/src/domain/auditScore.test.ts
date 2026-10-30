import { describe, expect, it } from 'vitest';
import { DOSE_LIMITS } from '../../../shared/doses';
import { UPPER_LIMITS } from '../data/upperLimits';
import { scoreStack, type ScoreProduct } from './auditScore';

function bottle(id: string, ingredients: { key: string; amount: number; unit?: string; family?: string }[], servingsPerDay = 1): ScoreProduct {
  return {
    id,
    servingsPerDay,
    ingredients: ingredients.map((ingredient) => ({ ...ingredient, unit: ingredient.unit ?? 'mg' })),
  };
}

describe('audit score', () => {
  it('uses the same upper limits as the cited table', () => {
    expect(DOSE_LIMITS.map(({ key, unit, ul, nearFrom }) => ({ key, unit, ul, nearFrom }))).toEqual(
      UPPER_LIMITS.map(({ key, unit, ul, nearFrom }) => ({ key, unit, ul, nearFrom })),
    );
  });

  it('starts at 100 when nothing is doubled up or above a limit', () => {
    expect(scoreStack([]).score).toBe(100);
    expect(scoreStack([bottle('a', [{ key: 'magnesium', amount: 200 }])]).score).toBe(100);
  });

  it('does not penalise a multivitamin plus a single nutrient that stays within the limit', () => {
    const result = scoreStack([
      bottle('multi', [
        { key: 'magnesium', amount: 100 },
        { key: 'zinc', amount: 10 },
      ]),
      bottle('mag', [{ key: 'magnesium', amount: 200 }]),
    ]);
    expect(result.score).toBe(100);
    expect(result.reasons[0]?.kind).toBe('overlap_ok');
  });

  it('flags a dose above the upper limit and a dose in the near band, with reasons', () => {
    const over = scoreStack([bottle('a', [{ key: 'zinc', amount: 50 }])]);
    expect(over.score).toBe(80);
    expect(over.reasons[0]?.text).toBe('Zinc 50 mg a day, above the 40 mg upper limit');
    expect(scoreStack([bottle('a', [{ key: 'zinc', amount: 36 }])]).score).toBe(95);
  });

  it('converts vitamin D micrograms into the IU limit', () => {
    expect(scoreStack([bottle('a', [{ key: 'vitamin-d', amount: 100, unit: 'mcg' }])]).parts.near).toBe(5);
    expect(scoreStack([bottle('a', [{ key: 'vitamin-d', amount: 101, unit: 'mcg' }])]).parts.over).toBe(20);
  });

  it('counts a doubled ingredient without an upper limit by family', () => {
    const result = scoreStack([
      bottle('a', [{ key: 'ashwagandha-ksm66', amount: 300, family: 'ashwagandha' }]),
      bottle('b', [{ key: 'ashwagandha-root', amount: 500, family: 'ashwagandha' }]),
    ]);
    expect(result.score).toBe(92);
    expect(result.summary).toBe('1 doubled up');
  });
});
