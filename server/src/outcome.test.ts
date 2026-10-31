import { describe, expect, it } from 'vitest';
import { addDays, computeOutcome, discoverOutcomeLine, validateOutcomeFields, type DayValue } from '../../shared/outcome';

const START = '2026-04-01';

function series(from: string, days: number, value: (index: number) => number): DayValue[] {
  return Array.from({ length: days }, (_, index) => ({ date: addDays(from, index), value: value(index) }));
}

/** Steady history with a wobble, then a step change from the start date. */
function history(after: number, wobble = 1) {
  const before = series(addDays(START, -300), 300, (index) => 60 + (index % 2 === 0 ? wobble : -wobble));
  const later = series(START, 100, () => after);
  return [...before, ...later];
}

describe('personal outcome', () => {
  it('waits for the full 12 week window', () => {
    const result = computeOutcome({ metric: 'resting_hr_bpm', samples: history(56), stackStart: START, device: 'Apple Watch', asOf: addDays(START, 60) });
    expect(result).toMatchObject({ eligible: false, readyOn: addDays(START, 97) });
  });

  it('reports a change bigger than normal variation', () => {
    const result = computeOutcome({ metric: 'resting_hr_bpm', samples: history(56), stackStart: START, device: 'Apple Watch', asOf: addDays(START, 100) });
    expect(result).toMatchObject({ eligible: true, direction: 'down', percent: -7, withinNormal: false });
    if (result.eligible) {
      expect(result.line).toBe('Resting heart rate down 7% over 12 weeks, measured on Apple Watch');
      expect(discoverOutcomeLine(result)).toBe('Resting heart rate down 7% over 12 weeks');
    }
  });

  it('calls a small change normal variation', () => {
    const result = computeOutcome({ metric: 'resting_hr_bpm', samples: history(59), stackStart: START, device: 'Apple Watch', asOf: addDays(START, 100) });
    expect(result).toMatchObject({ eligible: true, withinNormal: true, direction: 'flat' });
    if (result.eligible) expect(discoverOutcomeLine(result)).toBe('Resting heart rate showed no clear change over 12 weeks');
  });

  it('uses the history before the start to set the bar', () => {
    const noisy = [
      ...series(addDays(START, -700), 700, (index) => (Math.floor((700 - index - 1) / 98) % 2 === 0 ? 60 : 48)),
      ...series(START, 100, () => 55),
    ];
    const result = computeOutcome({ metric: 'resting_hr_bpm', samples: noisy, stackStart: START, device: 'Apple Watch', asOf: addDays(START, 100) });
    expect(result).toMatchObject({ eligible: true, withinNormal: true });
  });

  it('needs enough data before the start', () => {
    const sparse = series(addDays(START, -30), 130, () => 60);
    const result = computeOutcome({ metric: 'resting_hr_bpm', samples: sparse, stackStart: START, device: 'Apple Watch', asOf: addDays(START, 100) });
    expect(result).toMatchObject({ eligible: false });
  });

  it('accepts only consistent fields from the phone', () => {
    const good = { metric: 'hrv_sdnn_ms', direction: 'up', percent: 12, withinNormal: false, windowDays: 84, device: 'Apple Watch <b>' };
    expect(validateOutcomeFields(good)).toEqual({ ...good, device: 'Apple Watch b' });
    expect(validateOutcomeFields({ ...good, percent: 5 })).toBeNull();
    expect(validateOutcomeFields({ ...good, percent: 61 })).toBeNull();
    expect(validateOutcomeFields({ ...good, direction: 'flat' })).toBeNull();
    expect(validateOutcomeFields({ ...good, percent: 3, withinNormal: true, direction: 'flat' })).toMatchObject({ direction: 'flat' });
    expect(validateOutcomeFields({ ...good, line: 'Cured', metric: 'steps' })).toBeNull();
  });
});
