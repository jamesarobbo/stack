import { describe, expect, it } from 'vitest';
import { chipTone, shortProductName, suggestGoals } from './goalSuggestions';

describe('suggested goals', () => {
  it('maps the named ingredients and ignores a plain magnesium salt', () => {
    expect(suggestGoals([{ name: 'Magnesium glycinate', ingredients: [{ key: 'magnesium-glycinate', name: 'Magnesium glycinate' }] }])).toEqual(['sleep']);
    expect(suggestGoals([{ name: 'Magnesium oxide', ingredients: [{ key: 'magnesium', name: 'Magnesium oxide' }] }])).toEqual([]);
    expect(suggestGoals([{ name: 'Glycine', ingredients: [{ key: 'glycine', name: 'Glycine' }] }])).toEqual(['sleep']);
    expect(suggestGoals([{ name: 'Creatine', ingredients: [{ key: 'creatine', name: 'Creatine' }] }])).toEqual(['recovery']);
    expect(suggestGoals([{ name: 'Caffeine', ingredients: [{ key: 'caffeine', name: 'Caffeine' }] }])).toEqual(['focus']);
    expect(suggestGoals([{ name: 'Vitamin B12', ingredients: [{ key: 'b12', name: 'Vitamin B12' }] }])).toEqual(['energy']);
    expect(suggestGoals([{ name: 'Rhodiola', ingredients: [{ key: 'rhodiola', name: 'Rhodiola rosea' }] }])).toEqual(['energy']);
    expect(suggestGoals([{ name: 'NMN', ingredients: [{ key: 'nmn', name: 'Nicotinamide mononucleotide' }] }])).toEqual(['longevity']);
    expect(suggestGoals([{ name: 'Omega 3', ingredients: [{ key: 'omega-3', name: 'Omega-3' }] }])).toEqual(['heart']);
  });

  it('counts ingredient hits and keeps at most 3, ties in library order', () => {
    const products = [
      { name: 'Night', ingredients: [{ name: 'Magnesium glycinate' }, { name: 'Glycine' }, { name: 'Apigenin' }] },
      { name: 'Day', ingredients: [{ name: 'Caffeine' }] },
      { name: 'Heart', ingredients: [{ name: 'CoQ10' }] },
      { name: 'Lift', ingredients: [{ name: 'Creatine' }] },
      { name: 'Cell', ingredients: [{ name: 'NMN' }] },
    ];
    expect(suggestGoals(products)).toEqual(['sleep', 'heart', 'recovery']);
  });

  it('reads a product name when the ingredient list is empty', () => {
    expect(suggestGoals([{ name: 'L-theanine' }])).toEqual(['sleep']);
  });

  it('shortens a dose and tints known groups', () => {
    expect(shortProductName('Vitamin D3 4,000 IU')).toBe('Vitamin D3');
    expect(shortProductName('NMN 1,000 mg')).toBe('NMN');
    expect(chipTone('Magnesium glycinate')).toBe('sleep');
    expect(chipTone('NMN')).toBe('neutral');
    expect(chipTone('Creatine monohydrate')).toBe('recovery');
  });
});
