import { describe, expect, it } from 'vitest';
import { ageRangeFromBirthDate, prefillSex } from './demographics';

describe('demographic prefill', () => {
  it('maps a birthday onto an age range and leaves under 18 unset', () => {
    expect(ageRangeFromBirthDate('1996-10-30', '2026-10-30')).toBe('30_39');
    expect(ageRangeFromBirthDate('1996-10-31', '2026-10-30')).toBe('18_29');
    expect(ageRangeFromBirthDate('1960-01-01', '2026-10-30')).toBe('60_plus');
    expect(ageRangeFromBirthDate('2010-01-01', '2026-10-30')).toBeNull();
  });

  it('prefills female or male and leaves other values for the person to choose', () => {
    expect(prefillSex('female')).toBe('female');
    expect(prefillSex('male')).toBe('male');
    expect(prefillSex('other')).toBeNull();
    expect(prefillSex('notSet')).toBeNull();
  });
});
