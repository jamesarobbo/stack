import { describe, expect, it } from 'vitest';
import { clampStartDate, formatUsDate } from './dates';

describe('start dates', () => {
  it('formats a calendar day in US style', () => {
    expect(formatUsDate('2026-10-30').replace(/\s/g, ' ')).toBe('Oct 30, 2026');
  });

  it('keeps past days and rejects a future or empty day', () => {
    expect(clampStartDate('2026-01-02', '2026-10-30')).toBe('2026-01-02');
    expect(clampStartDate('2099-01-01', '2026-10-30')).toBe('2026-10-30');
    expect(clampStartDate('tomorrow', '2026-10-30')).toBe('2026-10-30');
  });
});
