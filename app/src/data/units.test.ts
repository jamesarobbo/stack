import { describe, expect, it } from 'vitest';
import { COMMON_INGREDIENTS } from './commonIngredients';
import { buildExample } from './example';
import { UNIT_OPTIONS, coerceUnit } from './units';

describe('ingredient unit options', () => {
  it('defaults to mg and maps aliases onto the picker', () => {
    expect(coerceUnit('')).toBe('mg');
    expect(coerceUnit('ug')).toBe('mcg');
    expect(coerceUnit('µg')).toBe('mcg');
    expect(coerceUnit('IU')).toBe('IU');
    expect(coerceUnit('blend')).toBe('other');
    expect(coerceUnit('mcg dfe')).toBe('mcg DFE');
    expect(coerceUnit('CFU')).toBe('CFU (billion)');
    expect(coerceUnit('ml')).toBe('mL');
  });

  it('keeps example and fallback units on the same list', () => {
    const units = [
      ...buildExample('2026-10-30').products.flatMap((product) => product.ingredients.map((ingredient) => ingredient.unit)),
      ...COMMON_INGREDIENTS.map((ingredient) => ingredient.unit),
    ];
    for (const unit of units) expect(UNIT_OPTIONS).toContain(unit);
    expect(units).toContain('other');
    expect(units).not.toContain('blend');
  });
});
