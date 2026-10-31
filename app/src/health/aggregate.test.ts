import { describe, expect, it } from 'vitest';
import { HISTORY_DAYS, LEAD_IN_DAYS, WINDOW_DAYS } from '../../../shared/outcome';
import { deepSleepByDay, deviceLabel, statisticsRows } from './aggregate';

function at(day: number, hour: number, minute = 0) {
  return new Date(2026, 3, day, hour, minute);
}

describe('health aggregation', () => {
  it('reads enough history for a baseline, a full after window, and a noise estimate', () => {
    expect(HISTORY_DAYS).toBeGreaterThanOrEqual(270);
    expect(HISTORY_DAYS).toBeGreaterThanOrEqual(WINDOW_DAYS * 2 + LEAD_IN_DAYS + 4 * 14 + WINDOW_DAYS);
  });

  it('uses one source per night for deep sleep instead of adding watch and ring together', () => {
    const rows = deepSleepByDay([
      { value: 4, startDate: at(2, 1), endDate: at(2, 1, 40), sourceId: 'watch' },
      { value: 4, startDate: at(2, 3), endDate: at(2, 3, 20), sourceId: 'watch' },
      { value: 4, startDate: at(2, 1), endDate: at(2, 2, 10), sourceId: 'ring' },
      { value: 3, startDate: at(2, 4), endDate: at(2, 6), sourceId: 'watch' },
    ]);
    expect(rows).toEqual([{ metric: 'deep_sleep_min', date: '2026-04-02', value: 70 }]);
  });

  it('keeps one row per day from statistics and drops empty days', () => {
    const rows = statisticsRows('steps', [
      { startDate: at(1, 0), value: 8123.4 },
      { startDate: at(2, 0), value: 0 },
      { startDate: at(3, 0) },
    ]);
    expect(rows).toEqual([{ metric: 'steps', date: '2026-04-01', value: 8123.4 }]);
  });

  it('never uses the source name, which often holds the owner name', () => {
    expect(deviceLabel({ model: 'Watch', sourceName: "Sam's Apple Watch" })).toBe('Apple Watch');
    expect(deviceLabel({ productType: 'iPhone15,2', sourceName: "Sam's iPhone" })).toBe('iPhone');
    expect(deviceLabel({ sourceName: 'Oura' })).toBe('Oura');
    expect(deviceLabel({ sourceName: "Sam's gadget" })).toBe('Apple Health');
  });
});
