import { describe, expect, it } from 'vitest';
import { scoreStack, type ScoreProduct } from '../../shared/auditScore';

function item(id: string, ingredients: ScoreProduct['ingredients'], servingsPerDay = 1): ScoreProduct {
  return { id, name: id, servingsPerDay, ingredients };
}

describe('audit score', () => {
  it('scores a clean stack 100 with a plain summary', () => {
    const result = scoreStack([item('mag', [{ key: 'magnesium', amount: 200, unit: 'mg' }])]);
    expect(result.score).toBe(100);
    expect(result.summary).toBe('No doses above the upper limit and nothing doubled up');
    expect(result.totals[0]).toMatchObject({ key: 'magnesium', amount: 200, unit: 'mg', ofLimit: 200 / 350 });
  });

  it('does not penalise overlap that stays within the limit', () => {
    const result = scoreStack([
      item('multi', [{ key: 'vitamin-d', amount: 25, unit: 'mcg' }]),
      item('d3', [{ key: 'vitamin-d', amount: 1000, unit: 'IU' }]),
    ]);
    expect(result.score).toBe(100);
    expect(result.reasons).toEqual([
      { kind: 'overlap_ok', key: 'vitamin-d', text: 'Vitamin D is in 2 products, within the limit in total', points: 0 },
    ]);
  });

  it('explains each deduction', () => {
    const result = scoreStack([
      item('zinc', [{ key: 'zinc', amount: 50, unit: 'mg' }]),
      item('ash1', [{ key: 'ashwagandha', name: 'Ashwagandha', amount: 300, unit: 'mg' }]),
      item('ash2', [{ key: 'ashwagandha', name: 'Ashwagandha', amount: 300, unit: 'mg' }]),
    ]);
    expect(result.score).toBe(72);
    expect(result.summary).toBe('1 above the upper limit, 1 doubled up');
    expect(result.reasons.map((reason) => [reason.kind, reason.points])).toEqual([
      ['over', 20],
      ['doubled', 8],
    ]);
    expect(result.reasons[0]?.text).toBe('Zinc 50 mg a day, above the 40 mg upper limit');
    expect(result.overTwiceLimit).toBe(false);
  });

  it('caps each kind so one problem cannot zero the score', () => {
    const many = ['zinc', 'iron', 'copper', 'manganese'].map((key) => item(key, [{ key, amount: 1000, unit: 'mg' }]));
    const result = scoreStack(many);
    expect(result.parts.over).toBe(40);
    expect(result.score).toBe(60);
    expect(result.overTwiceLimit).toBe(true);
  });

  it('does not check vitamin A in IU against the retinol limit', () => {
    const result = scoreStack([item('a', [{ key: 'vitamin-a', amount: 25000, unit: 'IU' }])]);
    expect(result.score).toBe(100);
    expect(result.reasons[0]?.kind).toBe('unchecked');
  });
});
