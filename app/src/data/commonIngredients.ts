import type { UnitOption } from './units';

/** Offline names for manual entry when label search cannot be reached. */
export type CommonIngredient = {
  key: string;
  name: string;
  unit: UnitOption;
};

export const COMMON_INGREDIENTS: CommonIngredient[] = [
  { key: 'magnesium', name: 'Magnesium', unit: 'mg' },
  { key: 'vitamin-d', name: 'Vitamin D', unit: 'IU' },
  { key: 'vitamin-b12', name: 'Vitamin B12', unit: 'mcg' },
  { key: 'folate', name: 'Folate', unit: 'mcg DFE' },
  { key: 'omega-3', name: 'EPA + DHA', unit: 'mg' },
  { key: 'zinc', name: 'Zinc', unit: 'mg' },
  { key: 'vitamin-c', name: 'Vitamin C', unit: 'mg' },
  { key: 'iron', name: 'Iron', unit: 'mg' },
  { key: 'calcium', name: 'Calcium', unit: 'mg' },
  { key: 'vitamin-e', name: 'Vitamin E', unit: 'mg' },
  { key: 'creatine', name: 'Creatine', unit: 'g' },
  { key: 'probiotic', name: 'Probiotic', unit: 'CFU (billion)' },
];
