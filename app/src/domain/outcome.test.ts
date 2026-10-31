import { describe, expect, it } from 'vitest';
import { addDays } from '../../../shared/outcome';
import { earliestReady, heroParts, personalResults, submittedFields } from './outcome';
import type { SampleInput } from './types';

const START = '2026-04-01';

function rhr(from: string, days: number, value: (index: number) => number): SampleInput[] {
  return Array.from({ length: days }, (_, index) => ({ metric: 'resting_hr_bpm' as const, date: addDays(from, index), value: value(index) }));
}

describe('personal results on the phone', () => {
  const samples = [...rhr(addDays(START, -300), 300, (index) => (index % 2 ? 61 : 59)), ...rhr(START, 100, () => 56)];

  it('works out each metric and sends only derived fields', () => {
    const results = personalResults({ samples, stackStart: START, device: 'Apple Watch', today: addDays(START, 100) });
    const resting = results.find((item) => item.metric === 'resting_hr_bpm');
    expect(resting).toMatchObject({ eligible: true, percent: -7, direction: 'down' });
    if (resting?.eligible) {
      expect(Object.keys(submittedFields(resting)).sort()).toEqual(['device', 'direction', 'metric', 'percent', 'windowDays', 'withinNormal']);
      expect(heroParts(resting)).toEqual({ value: '7%', word: 'lower' });
    }
    expect(results.find((item) => item.metric === 'hrv_sdnn_ms')?.eligible).toBe(false);
  });

  it('says when results will be ready', () => {
    const results = personalResults({ samples, stackStart: START, device: 'Apple Watch', today: addDays(START, 30) });
    expect(earliestReady(results)).toBe(addDays(START, 97));
  });

  it('treats implausible changes as misses', () => {
    const wild = [...rhr(addDays(START, -300), 300, () => 60), ...rhr(START, 100, () => 20)];
    const results = personalResults({ samples: wild, stackStart: START, device: 'Apple Watch', today: addDays(START, 100) });
    expect(results.find((item) => item.metric === 'resting_hr_bpm')?.eligible).toBe(false);
  });
});
