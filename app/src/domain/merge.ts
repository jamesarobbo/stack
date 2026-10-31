import { scoreStack, type ScoreProduct } from './auditScore';
import type { IngredientInput, ProductInput } from './types';

export type SharedIngredient = { key: string; name: string; amount: number; unit: string; family?: string; familyLabel?: string };
export type SharedProduct = {
  id: string;
  name: string;
  brand: string;
  servingsPerContainer: number;
  servingsPerDay: number;
  source?: 'off' | null;
  ingredients: SharedIngredient[];
};

export type MergeStatus = 'new' | 'same' | 'overlap';
export type MergeChoice = 'add' | 'skip' | 'replace';

export type MergeRow = {
  product: SharedProduct;
  status: MergeStatus;
  /** Products already in your stack that this one matches or overlaps. */
  mine: { id: string; name: string }[];
  /** Shared ingredient labels, for example "Magnesium". */
  overlapping: string[];
  choice: MergeChoice;
};

function sameProduct(a: { name: string; brand: string | null }, b: { name: string; brand: string | null }): boolean {
  const clean = (value: string | null) => (value ?? '').trim().toLowerCase();
  return clean(a.name) === clean(b.name) && clean(a.brand) === clean(b.brand);
}

function families(ingredients: { key: string; family?: string; familyLabel?: string; name: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const ingredient of ingredients) map.set(ingredient.family ?? ingredient.key, ingredient.familyLabel ?? ingredient.name);
  return map;
}

/** What copying would do: products you already take, overlaps, and what is new. */
export function planMerge(mine: ProductInput[], theirs: SharedProduct[]): MergeRow[] {
  return theirs.map((product) => {
    const exact = mine.filter((item) => sameProduct(item, product));
    if (exact.length > 0) {
      return { product, status: 'same', mine: exact.map(({ id, name }) => ({ id, name })), overlapping: [], choice: 'skip' };
    }
    const wanted = families(product.ingredients);
    const overlaps: { id: string; name: string }[] = [];
    const labels = new Set<string>();
    for (const item of mine) {
      const have = families(item.ingredients);
      const shared = [...wanted.keys()].filter((key) => have.has(key));
      if (shared.length === 0) continue;
      overlaps.push({ id: item.id, name: item.name });
      for (const key of shared) labels.add(wanted.get(key) ?? key);
    }
    if (overlaps.length > 0) return { product, status: 'overlap', mine: overlaps, overlapping: [...labels], choice: 'add' };
    return { product, status: 'new', mine: [], overlapping: [], choice: 'add' };
  });
}

export function choicesFor(status: MergeStatus): MergeChoice[] {
  if (status === 'new') return ['add', 'skip'];
  return ['add', 'skip', 'replace'];
}

/** Products to remove and products to add for the chosen rows. */
export function applyPlan(rows: MergeRow[]): { add: SharedProduct[]; replaceIds: string[] } {
  const add: SharedProduct[] = [];
  const replace = new Set<string>();
  for (const row of rows) {
    if (row.choice === 'skip') continue;
    add.push(row.product);
    if (row.choice === 'replace') for (const item of row.mine) replace.add(item.id);
  }
  return { add, replaceIds: [...replace] };
}

function toScore(product: { id: string; servingsPerDay: number; ingredients: (IngredientInput | SharedIngredient)[] }): ScoreProduct {
  return {
    id: product.id,
    servingsPerDay: product.servingsPerDay,
    ingredients: product.ingredients.map((ingredient) => ({
      key: ingredient.key,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      family: ingredient.family,
      familyLabel: ingredient.familyLabel,
    })),
  };
}

/** Your score now and after the chosen rows are applied. */
export function scoreAfter(mine: ProductInput[], rows: MergeRow[]): { before: number; after: number; summary: string } {
  const { add, replaceIds } = applyPlan(rows);
  const before = scoreStack(mine.map(toScore)).score;
  const kept = mine.filter((item) => !replaceIds.includes(item.id)).map(toScore);
  const added = add.map((product, index) => toScore({ ...product, id: `copy-${index}-${product.id}` }));
  const result = scoreStack([...kept, ...added]);
  return { before, after: result.score, summary: result.summary };
}

/**
 * A product was copied from this share when it carries its catalogue id.
 * The :off suffix keeps Open Food Facts attribution when the copy is shared again.
 */
export function shareCatalogueId(slug: string, fromOpenFoodFacts = false): string {
  return `share:${slug}${fromOpenFoodFacts ? ':off' : ''}`;
}

export function copiedFrom(catalogueId: string | null | undefined): string | null {
  if (!catalogueId?.startsWith('share:')) return null;
  return catalogueId.slice(6).split(':')[0] || null;
}

export function isOpenFoodFactsProduct(catalogueId: string | null | undefined): boolean {
  return !!catalogueId && (catalogueId.startsWith('off:') || (catalogueId.startsWith('share:') && catalogueId.endsWith(':off')));
}

export function copiedProducts(mine: ProductInput[], slug: string): ProductInput[] {
  return mine.filter((item) => copiedFrom(item.catalogueId) === slug);
}
