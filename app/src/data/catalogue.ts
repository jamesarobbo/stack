import type { IngredientInput } from '../domain/types';

export type CatalogueItem = {
  id: string;
  name: string;
  brand: string;
  priceCents: number;
  servingsPerContainer: number;
  servingsPerDay: number;
  ingredients: IngredientInput[];
};

const brands = ['Northline', 'Harbor & Co', 'Fieldnote', 'Lowlight', 'Clearday', 'Paperweight'] as const;

function item(
  id: string,
  name: string,
  priceCents: number,
  ingredients: IngredientInput[],
  brandIndex = 0,
): CatalogueItem {
  return {
    id,
    name,
    brand: brands[brandIndex % brands.length] ?? 'Northline',
    priceCents,
    servingsPerContainer: 30,
    servingsPerDay: 1,
    ingredients,
  };
}

function ing(key: string, name: string, amount: number, unit: string): IngredientInput {
  return { key, name, amount, unit, costWeight: 1 };
}

/** Fictional products for search. Amounts are label examples, not suggestions. */
export const CATALOGUE: CatalogueItem[] = [
  item('nmn', 'NMN 1,000 mg', 4600, [ing('nmn', 'NMN', 1000, 'mg')], 0),
  item('tmg', 'TMG 500 mg', 3200, [ing('tmg', 'TMG', 500, 'mg')], 1),
  item('resveratrol', 'Resveratrol 500 mg', 3600, [ing('resveratrol', 'Resveratrol', 500, 'mg')], 2),
  item('mag-glycinate', 'Magnesium glycinate', 1800, [ing('magnesium', 'Magnesium', 200, 'mg')], 3),
  item('mag-threonate', 'Magnesium threonate', 4200, [ing('magnesium', 'Magnesium', 144, 'mg')], 4),
  item('mag-citrate', 'Magnesium citrate', 1400, [ing('magnesium', 'Magnesium', 200, 'mg')], 5),
  item('vitamin-d3', 'Vitamin D3', 1400, [ing('vitamin-d', 'Vitamin D3', 1000, 'IU')], 0),
  item('b-complex', 'B-complex', 1600, [
    ing('vitamin-b6', 'Vitamin B6', 10, 'mg'),
    ing('vitamin-b12', 'Vitamin B12', 250, 'mcg'),
    ing('folate', 'Folate', 400, 'mcg'),
  ], 1),
  item('multi', 'Multivitamin', 2900, [
    ing('magnesium', 'Magnesium', 50, 'mg'),
    ing('vitamin-b6', 'Vitamin B6', 2, 'mg'),
    ing('vitamin-b12', 'Vitamin B12', 25, 'mcg'),
    ing('zinc', 'Zinc', 11, 'mg'),
  ], 2),
  item('creatine', 'Creatine monohydrate', 2200, [ing('creatine', 'Creatine', 5000, 'mg')], 3),
  item('omega-3', 'Omega-3', 2800, [ing('omega-3', 'EPA + DHA', 1000, 'mg')], 4),
  item('fisetin', 'Fisetin', 3400, [ing('fisetin', 'Fisetin', 100, 'mg')], 5),
  item('spermidine', 'Spermidine', 4800, [ing('spermidine', 'Spermidine', 1, 'mg')], 0),
  item('berberine', 'Berberine', 2600, [ing('berberine', 'Berberine', 500, 'mg')], 1),
  item('k2', 'Vitamin K2 MK-7', 1800, [ing('vitamin-k', 'Vitamin K2', 100, 'mcg')], 2),
  item('vitamin-c', 'Vitamin C', 1200, [ing('vitamin-c', 'Vitamin C', 500, 'mg')], 3),
  item('zinc', 'Zinc', 900, [ing('zinc', 'Zinc', 15, 'mg')], 4),
  item('coq10', 'CoQ10', 3200, [ing('coq10', 'CoQ10', 100, 'mg')], 5),
  item('ashwagandha', 'Ashwagandha', 2400, [ing('ashwagandha', 'Ashwagandha', 300, 'mg')], 0),
  item('theanine', 'L-theanine', 1800, [ing('l-theanine', 'L-theanine', 200, 'mg')], 1),
  item('apigenin', 'Apigenin', 2200, [ing('apigenin', 'Apigenin', 50, 'mg')], 2),
  item('glycine', 'Glycine', 1600, [ing('glycine', 'Glycine', 3000, 'mg')], 3),
  item('collagen', 'Collagen peptides', 3400, [ing('collagen', 'Collagen', 10000, 'mg')], 4),
  item('melatonin', 'Melatonin', 800, [ing('melatonin', 'Melatonin', 0.3, 'mg')], 5),
  item('iron', 'Iron', 1100, [ing('iron', 'Iron', 18, 'mg')], 0),
  item('calcium', 'Calcium', 1400, [ing('calcium', 'Calcium', 500, 'mg')], 1),
  item('b12', 'Vitamin B12', 1000, [ing('vitamin-b12', 'Vitamin B12', 500, 'mcg')], 2),
  item('folate', 'Folate', 1200, [ing('folate', 'Folate', 400, 'mcg')], 3),
  item('lions-mane', "Lion's mane", 2800, [ing('lions-mane', "Lion's mane", 500, 'mg')], 4),
  item('curcumin', 'Curcumin', 2600, [ing('curcumin', 'Curcumin', 500, 'mg')], 5),
  item('quercetin', 'Quercetin', 2200, [ing('quercetin', 'Quercetin', 500, 'mg')], 0),
  item('nac', 'NAC', 2000, [ing('nac', 'NAC', 600, 'mg')], 1),
  item('taurine', 'Taurine', 1400, [ing('taurine', 'Taurine', 1000, 'mg')], 2),
  item('alpha-gpc', 'Alpha-GPC', 3600, [ing('alpha-gpc', 'Alpha-GPC', 300, 'mg')], 3),
  item('rhodiola', 'Rhodiola', 2000, [ing('rhodiola', 'Rhodiola', 200, 'mg')], 4),
  item('hyaluronic', 'Hyaluronic acid', 2400, [ing('hyaluronic-acid', 'Hyaluronic acid', 120, 'mg')], 5),
  item('lutein', 'Lutein', 1800, [ing('lutein', 'Lutein', 10, 'mg')], 0),
  item('astaxanthin', 'Astaxanthin', 2800, [ing('astaxanthin', 'Astaxanthin', 6, 'mg')], 1),
  item('pqq', 'PQQ', 3200, [ing('pqq', 'PQQ', 20, 'mg')], 2),
  item('vitamin-e', 'Vitamin E', 1400, [ing('vitamin-e', 'Vitamin E', 15, 'mg')], 3),
  item('selenium', 'Selenium', 900, [ing('selenium', 'Selenium', 100, 'mcg')], 4),
  item('ca-akg', 'Calcium AKG', 4400, [ing('ca-akg', 'Calcium AKG', 500, 'mg')], 5),
  item('boron', 'Boron', 1100, [ing('boron', 'Boron', 3, 'mg')], 0),
  item('iodine', 'Iodine', 800, [ing('iodine', 'Iodine', 150, 'mcg')], 1),
];

export function searchCatalogue(query: string): CatalogueItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return CATALOGUE;
  return CATALOGUE.filter((entry) => {
    const hay = [entry.name, entry.brand, ...entry.ingredients.map((ingredient) => ingredient.name)]
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });
}
