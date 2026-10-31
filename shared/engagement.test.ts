import { describe, expect, it } from 'vitest';
import { compactCount, copiesLabel, groupedCount, viewsLabel } from './engagement';

describe('compact counts', () => {
  it('keeps small numbers whole and shortens thousands', () => {
    expect(compactCount(25)).toBe('25');
    expect(compactCount(999)).toBe('999');
    expect(compactCount(1000)).toBe('1k');
    expect(compactCount(1200)).toBe('1.2k');
    expect(compactCount(1050)).toBe('1.1k');
    expect(compactCount(10_499)).toBe('10k');
    expect(compactCount(12_000)).toBe('12k');
    expect(compactCount(1_200_000)).toBe('1.2m');
  });

  it('spells the full count for accessibility', () => {
    expect(groupedCount(1200)).toBe('1,200');
    expect(copiesLabel(25)).toBe('25 copies');
    expect(viewsLabel(1200)).toBe('1,200 views');
  });
});
