import { describe, expect, it } from 'vitest';
import { AUDIT_EMPTY, IMPACT_EMPTY, REPORT_EMPTY, freshStartGaps } from './emptyStates';

describe('fresh empty states', () => {
  it('asks for supplements and wearable days when both are missing', () => {
    expect(freshStartGaps({ products: 0, wearableSamples: 0 })).toEqual(['products', 'wearable']);
  });

  it('asks only for wearable days once a product is logged', () => {
    expect(freshStartGaps({ products: 2, wearableSamples: 0 })).toEqual(['wearable']);
    expect(freshStartGaps({ products: 2, wearableSamples: 40 })).toEqual([]);
  });

  it('keeps the empty copy in sentence case', () => {
    const lines = [AUDIT_EMPTY.title, AUDIT_EMPTY.body, IMPACT_EMPTY.productsTitle, IMPACT_EMPTY.wearableTitle, REPORT_EMPTY.title];
    for (const line of lines) {
      expect(line).not.toBe(line.toUpperCase());
    }
    expect(IMPACT_EMPTY.wearableBody).toContain('few weeks');
    expect(REPORT_EMPTY.wearable).toContain('few weeks');
  });
});
