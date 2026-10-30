import { describe, expect, it } from 'vitest';
import { aggregateOutcomes, cohortLine, personalOutcome, type OutcomeRow } from './outcome';

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fill(start: string, count: number, value: number) {
  return Array.from({ length: count }, (_, index) => ({ date: addDays(start, index), value }));
}

const START = '2026-04-01';

describe('personal outcome', () => {
  it('describes a relative change against the person own baseline', () => {
    const result = personalOutcome({
      metric: 'resting_hr_bpm',
      samples: [...fill(addDays(START, -90), 60, 50), ...fill(START, 30, 47)],
      stackStart: START,
      device: 'Oura',
      asOf: addDays(START, 89),
    });
    expect(result.eligible).toBe(true);
    if (!result.eligible) return;
    expect(result.percent).toBe(-6);
    expect(result.windowDays).toBe(90);
    expect(result.line).toBe('Resting heart rate down 6% over 90 days, measured on Oura');
    expect(result.disclaimer).toBe('1 person, not a trial');
    expect(result.framing).toBe('What changed for me');
    expect(result.line.toLowerCase()).not.toContain('caused');
    expect(result.line.toLowerCase()).not.toContain('improved');
  });

  it('says when there are not enough days before or after the start', () => {
    const shortBefore = personalOutcome({
      metric: 'hrv_sdnn_ms',
      samples: [...fill(addDays(START, -20), 10, 40), ...fill(START, 30, 44)],
      stackStart: START,
      device: 'Apple Health',
      asOf: addDays(START, 89),
    });
    expect(shortBefore).toEqual({ eligible: false, reason: 'Not enough wearable data before the stack started.' });

    const shortAfter = personalOutcome({
      metric: 'deep_sleep_min',
      samples: [...fill(addDays(START, -90), 60, 40), ...fill(START, 10, 48)],
      stackStart: START,
      device: 'Apple Health',
      asOf: addDays(START, 20),
    });
    expect(shortAfter).toEqual({ eligible: false, reason: 'Not enough days after the stack started.' });
  });
});

describe('copier aggregate', () => {
  it('hides the average until 10 people have a 90 day window', () => {
    const rows = Array.from({ length: 9 }, () => row('resting_hr_bpm', -6, 90, '30_39', 'male'));
    expect(aggregateOutcomes(rows)).toBeNull();
    const shown = aggregateOutcomes([...rows, row('resting_hr_bpm', -6, 90, '30_39', 'male')]);
    expect(shown?.people).toBe(10);
    expect(shown?.averagePercent).toBe(-6);
    expect(shown?.cohort).toBe('Mostly men 30 to 39');
    expect(shown?.disclaimer).toBe('Real-world data, not a trial');
  });

  it('drops shorter windows and filters people like you without ranking stacks', () => {
    const long = Array.from({ length: 10 }, () => row('resting_hr_bpm', -4, 90, '30_39', 'male'));
    const short = Array.from({ length: 10 }, () => row('resting_hr_bpm', -20, 60, '30_39', 'male'));
    expect(aggregateOutcomes([...long, ...short])?.averagePercent).toBe(-4);

    const mixed = [
      ...Array.from({ length: 6 }, () => row('hrv_sdnn_ms', 8, 90, '40_49', 'female')),
      ...Array.from({ length: 4 }, () => row('hrv_sdnn_ms', 2, 90, '18_29', 'male')),
    ];
    expect(aggregateOutcomes(mixed, { ageRange: '40_49', sex: 'female' })).toBeNull();
    const enough = [
      ...mixed,
      ...Array.from({ length: 4 }, () => row('hrv_sdnn_ms', 8, 90, '40_49', 'female')),
    ];
    const like = aggregateOutcomes(enough, { ageRange: '40_49', sex: 'female' });
    expect(like?.people).toBe(10);
    expect(like?.cohort).toBe('Mostly women 40 to 49');
  });

  it('names a mixed cohort when no group is 40 percent', () => {
    const rows = [
      row('steps', 1, 90, '18_29', 'female'),
      row('steps', 1, 90, '30_39', 'male'),
      row('steps', 1, 90, '40_49', 'female'),
    ];
    expect(cohortLine(rows)).toBe('A mix of ages');
  });
});

function row(metric: OutcomeRow['metric'], percentChange: number, windowDays: number, ageRange: string, sex: string): OutcomeRow {
  return { metric, percentChange, windowDays, ageRange, sex };
}
