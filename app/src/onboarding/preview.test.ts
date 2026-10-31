import { describe, expect, it } from 'vitest';
import { buildExample } from '../data/example';
import { GOALS, SPEND_OPTIONS, becauseLine, goalEcho, spendLine, toggleGoal, wearableLine } from './answers';
import { AUDIT_CHECKS, buildOnboardingPreview } from './preview';

const TODAY = '2026-10-30';

describe('onboarding answers', () => {
  it('lets someone say they are not sure, and clears that when they pick a goal', () => {
    expect(toggleGoal([], 'unsure')).toEqual(['unsure']);
    expect(toggleGoal(['sleep', 'focus'], 'unsure')).toEqual(['unsure']);
    expect(toggleGoal(['unsure'], 'sleep')).toEqual(['sleep']);
    expect(toggleGoal(['sleep'], 'sleep')).toEqual([]);
  });

  it('changes the later copy for every goal and every spend answer', () => {
    const echoes = GOALS.map((goal) => goalEcho([goal.key]));
    const becauses = GOALS.map((goal) => becauseLine([goal.key]));
    expect(new Set(echoes).size).toBe(GOALS.length);
    expect(new Set(becauses).size).toBe(GOALS.length);
    const spends = SPEND_OPTIONS.map((option) => spendLine(option.key, 17500));
    expect(new Set(spends).size).toBe(SPEND_OPTIONS.length);
    expect(new Set(['healthkit', 'sample', 'skipped'].map((choice) => wearableLine(choice))).size).toBe(3);
  });

  it('echoes a single goal in plain language', () => {
    expect(goalEcho(['sleep'])).toBe('For better sleep');
    expect(becauseLine(['sleep', 'energy'])).toBe('Because you said you want to sleep better and have more energy.');
    expect(becauseLine(['unsure'])).toBe('Because you said you were not sure yet.');
  });
});

describe('onboarding audit preview', () => {
  const products = buildExample(TODAY).products;

  it('uses the real example audit, not a made-up saving', () => {
    const preview = buildOnboardingPreview(products, ['sleep'], 'under50', 'skipped');
    expect(preview.empty).toBe(false);
    expect(preview.clean).toBe(false);
    expect(preview.goalLine).toBe('For better sleep');
    expect(preview.because).toBe('Because you said you want to sleep better.');
    expect(preview.wastedCents).toBe(2700);
    expect(preview.wastedLabel).toBe('$27 a month');
    expect(preview.monthlySpendCents).toBe(17500);
    expect(preview.spendLine).toBe('You put the monthly spend at under $50. The labels you entered add up to $175 a month.');
    expect(preview.duplicateLabels).toEqual(['Magnesium', 'B-complex (B6 / B12)']);
    expect(preview.limitLines[0]).toContain('Vitamin D');
    expect(preview.limitLines[0]).toContain('near the NIH ODS upper limit');
    expect(preview.wearableLine).toContain('skipped');
  });

  it('stays honest when the stack is empty', () => {
    const preview = buildOnboardingPreview([], ['unsure'], 'unsure', 'skipped');
    expect(preview.empty).toBe(true);
    expect(preview.headline).toBe('Nothing to audit yet');
    expect(preview.wastedCents).toBe(0);
    expect(preview.wastedLabel).toBeNull();
    expect(preview.duplicateLabels).toEqual([]);
    expect(preview.limitLines).toEqual([]);
    expect(preview.spendLine).toBe('You were not sure of the monthly spend. No prices are entered yet.');
    expect(preview.headline).not.toMatch(/\$\d/);
  });

  it('stays honest when nothing overlaps', () => {
    const preview = buildOnboardingPreview(
      [
        {
          id: 'mag',
          name: 'Magnesium',
          brand: null,
          note: null,
          priceCents: 2000,
          servingsPerContainer: 30,
          servingsPerDay: 1,
          startDate: TODAY,
          ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg', costWeight: 1 }],
        },
      ],
      ['energy'],
      '50to100',
      'healthkit',
    );
    expect(preview.clean).toBe(true);
    expect(preview.headline).toBe('No overlap in this stack');
    expect(preview.wastedCents).toBe(0);
    expect(preview.duplicateLabels).toEqual([]);
    expect(preview.spendLine).toContain('$50 to $100');
    expect(preview.spendLine).toContain('$20 a month');
  });

  it('names the four checks the loader runs', () => {
    expect(AUDIT_CHECKS).toEqual([
      'Duplicate ingredients',
      'Overlapping products',
      'Doses above common upper limits',
      'Spend',
    ]);
  });
});
