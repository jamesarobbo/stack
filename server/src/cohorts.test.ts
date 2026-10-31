import { describe, expect, it } from 'vitest';
import { buildCohorts, percentBand, peopleBand, suppress, type CohortRow } from './cohorts';

function rows(count: number, sex: string, ageRange: string, percent: number, offset = 0): CohortRow[] {
  return Array.from({ length: count }, (_, index) => ({
    userId: `${sex}-${ageRange}-${index + offset}`,
    metric: 'resting_hr_bpm',
    percent,
    ageRange,
    sex,
  }));
}

function keys(report: ReturnType<typeof buildCohorts>): string[] {
  return report.metrics[0]?.slices.map((slice) => slice.key) ?? [];
}

describe('cohorts', () => {
  it('shows nothing below 10 people', () => {
    expect(buildCohorts(rows(9, 'female', '30_39', -6), '2026-10-30').metrics).toEqual([]);
  });

  it('hides a slice when the people outside it are fewer than 10', () => {
    const report = buildCohorts([...rows(25, 'female', '30_39', -6), ...rows(4, 'male', '30_39', 2)], '2026-10-30');
    expect(keys(report)).toEqual(['all']);
  });

  it('cannot be differenced across sex and age slices', () => {
    const data = [
      ...rows(30, 'female', '30_39', -6),
      ...rows(12, 'female', '50_59', -2),
      ...rows(3, 'female', '60_plus', 9),
      ...rows(20, 'male', '40_49', -1),
    ];
    const shown = keys(buildCohorts(data, '2026-10-30'));
    expect(shown).toContain('female');
    expect(shown).toContain('male');
    expect(shown).not.toContain('female_60_plus');
    expect(shown.filter((key) => key.startsWith('female_'))).toEqual(['female_under_40']);
    expect(shown).toContain('male_40_59');
  });

  it('reports bands, not exact numbers', () => {
    expect(percentBand(-6.4)).toEqual({ direction: 'down', band: 'down 5 to 10%' });
    expect(percentBand(3)).toEqual({ direction: 'up', band: 'up by less than 5%' });
    expect(percentBand(-1)).toEqual({ direction: 'flat', band: 'about the same' });
    expect(peopleBand(10)).toBe('10 to 19 people');
    expect(peopleBand(64)).toBe('50 to 99 people');
    const line = buildCohorts(rows(12, 'female', '30_39', -7), '2026-10-30').metrics[0]?.slices[0]?.line;
    expect(line).toBe('Typical change in resting heart rate: down 5 to 10%, 10 to 19 people');
  });

  it('keeps only children whose complements are safe', () => {
    expect([...suppress(40, [{ key: 'female', count: 30 }, { key: 'male', count: 10 }])].sort()).toEqual(['female', 'male']);
    expect([...suppress(35, [{ key: 'female', count: 30 }, { key: 'male', count: 5 }])]).toEqual([]);
    expect([...suppress(45, [{ key: 'female', count: 30 }, { key: 'male', count: 10 }])]).toEqual(['female']);
  });
});
