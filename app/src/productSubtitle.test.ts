import { describe, expect, it } from 'vitest';
import { humanProductNote, isCatalogueNote, productSubtitle, servingSizeFromNote } from './productSubtitle';

describe('productSubtitle', () => {
  it('prefers brand and label serving when one serving a day', () => {
    expect(
      productSubtitle({ brand: 'Thorne', note: 'NIH DSLD 19279. Serving size: 3 Capsules.', servingsPerDay: 1 }),
    ).toBe('Thorne, 3 capsules a day');
  });

  it('hides catalogue notes and uses servings a day', () => {
    expect(
      productSubtitle({ brand: null, note: 'NIH DSLD 19279. Serving size: 3 Capsules.', servingsPerDay: 3 }),
    ).toBe('3 a day');
  });

  it('keeps a human note when there is no brand', () => {
    expect(productSubtitle({ brand: null, note: 'Night only', servingsPerDay: 1 })).toBe('Night only');
  });

  it('falls back to servings a day', () => {
    expect(productSubtitle({ brand: 'Northline', note: null, servingsPerDay: 2 })).toBe('Northline, 2 a day');
  });
});

describe('servingSizeFromNote', () => {
  it('reads serving size from catalogue notes', () => {
    expect(servingSizeFromNote('NIH DSLD 19279. Serving size: 3 Capsules.')).toBe('3 Capsules');
  });
});

describe('isCatalogueNote', () => {
  it('flags NIH and barcode notes', () => {
    expect(isCatalogueNote('NIH DSLD 19279. Serving size: 3 Capsules.')).toBe(true);
    expect(isCatalogueNote('Barcode 088395056116.')).toBe(true);
    expect(isCatalogueNote('Night only')).toBe(false);
  });
});

describe('humanProductNote', () => {
  it('stores brand and label serving quietly', () => {
    expect(humanProductNote({ brand: 'Thorne', servingSize: '3 Capsules' })).toBe('Thorne. Label serving: 3 Capsules.');
    expect(humanProductNote({ brand: null, servingSize: '1 serving' })).toBe(null);
  });
});
