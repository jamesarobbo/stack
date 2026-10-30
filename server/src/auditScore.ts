/**
 * Dose-only audit score. See docs/audit-score.md.
 * Price is not an input.
 */

export type ScoreIngredient = { key: string; amount: number; unit: string };
export type ScoreProduct = { id: string; servingsPerDay: number; ingredients: ScoreIngredient[] };

const WEIGHTS = { extraProduct: 12, over: 20, near: 8, redundant: 15 };
const CAPS = { duplicate: 48, limit: 40, redundant: 30 };

const CONVERSIONS: Record<string, Record<string, number>> = {
  'vitamin-d': { iu: 1, mcg: 40, mg: 40_000, g: 40_000_000 },
  'vitamin-a': { mcg: 1, 'mcg rae': 1, iu: 0.3, mg: 1000, g: 1_000_000 },
  'vitamin-e': { mg: 1, iu: 0.67, mcg: 0.001, g: 1000 },
  'vitamin-c': { mg: 1, g: 1000, mcg: 0.001 },
  'vitamin-b6': { mg: 1, mcg: 0.001, g: 1000 },
  folate: { mcg: 1, 'mcg dfe': 0.6, mg: 1000, g: 1_000_000 },
  niacin: { mg: 1, 'mg ne': 1, mcg: 0.001, g: 1000 },
  choline: { mg: 1, g: 1000, mcg: 0.001 },
  calcium: { mg: 1, g: 1000, mcg: 0.001 },
  iron: { mg: 1, mcg: 0.001, g: 1000 },
  zinc: { mg: 1, mcg: 0.001, g: 1000 },
  magnesium: { mg: 1, g: 1000, mcg: 0.001 },
  selenium: { mcg: 1, mg: 1000, g: 1_000_000 },
  iodine: { mcg: 1, mg: 1000, g: 1_000_000 },
  copper: { mg: 1, mcg: 0.001, g: 1000 },
  manganese: { mg: 1, mcg: 0.001, g: 1000 },
  molybdenum: { mcg: 1, mg: 1000, g: 1_000_000 },
  boron: { mg: 1, mcg: 0.001, g: 1000 },
  'vitamin-b12': { mcg: 1, mg: 1000, g: 1_000_000 },
};

const LIMITS: { key: string; ul: number }[] = [
  { key: 'vitamin-d', ul: 4000 },
  { key: 'vitamin-a', ul: 3000 },
  { key: 'vitamin-e', ul: 1000 },
  { key: 'vitamin-c', ul: 2000 },
  { key: 'vitamin-b6', ul: 100 },
  { key: 'folate', ul: 1000 },
  { key: 'niacin', ul: 35 },
  { key: 'choline', ul: 3500 },
  { key: 'calcium', ul: 2500 },
  { key: 'iron', ul: 45 },
  { key: 'zinc', ul: 40 },
  { key: 'magnesium', ul: 350 },
  { key: 'selenium', ul: 400 },
  { key: 'iodine', ul: 1100 },
  { key: 'copper', ul: 10 },
  { key: 'manganese', ul: 11 },
  { key: 'molybdenum', ul: 2000 },
  { key: 'boron', ul: 20 },
];

export type ScoreParts = { score: number; duplicate: number; limits: number; redundant: number };

export function auditScore(products: ScoreProduct[]): number {
  return auditScoreParts(products).score;
}

export function auditScoreParts(products: ScoreProduct[]): ScoreParts {
  const duplicate = Math.min(CAPS.duplicate, extraProducts(products) * WEIGHTS.extraProduct);
  const limits = Math.min(CAPS.limit, limitPoints(products));
  const redundant = Math.min(CAPS.redundant, redundantProducts(products) * WEIGHTS.redundant);
  const score = Math.max(0, Math.min(100, 100 - duplicate - limits - redundant));
  return { score, duplicate, limits, redundant };
}

function extraProducts(products: ScoreProduct[]): number {
  const byKey = productIdsByKey(products);
  let extra = 0;
  for (const ids of byKey.values()) {
    if (ids.size >= 2) extra += ids.size - 1;
  }
  return extra;
}

function redundantProducts(products: ScoreProduct[]): number {
  const byKey = productIdsByKey(products);
  let count = 0;
  for (const product of products) {
    const keys = countedKeys(product);
    if (keys.length === 0) continue;
    const redundant = keys.every((key) => (byKey.get(key)?.size ?? 0) >= 2);
    if (redundant) count += 1;
  }
  return count;
}

function limitPoints(products: ScoreProduct[]): number {
  const totals = new Map<string, number>();
  for (const product of products) {
    const perDay = Number.isFinite(product.servingsPerDay) && product.servingsPerDay > 0 ? product.servingsPerDay : 0;
    for (const ingredient of product.ingredients) {
      if (!LIMITS.some((row) => row.key === ingredient.key)) continue;
      const canonical = toCanonical(ingredient.key, ingredient.amount * perDay, ingredient.unit);
      if (!canonical) continue;
      totals.set(ingredient.key, (totals.get(ingredient.key) ?? 0) + canonical);
    }
  }
  let points = 0;
  for (const row of LIMITS) {
    const total = totals.get(row.key);
    if (total == null) continue;
    if (total > row.ul) points += WEIGHTS.over;
    else if (total >= row.ul * 0.9) points += WEIGHTS.near;
  }
  return points;
}

function productIdsByKey(products: ScoreProduct[]): Map<string, Set<string>> {
  const byKey = new Map<string, Set<string>>();
  for (const product of products) {
    for (const key of countedKeys(product)) {
      const ids = byKey.get(key) ?? new Set<string>();
      ids.add(product.id);
      byKey.set(key, ids);
    }
  }
  return byKey;
}

function countedKeys(product: ScoreProduct): string[] {
  const keys: string[] = [];
  for (const ingredient of product.ingredients) {
    if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) continue;
    if (!keys.includes(ingredient.key)) keys.push(ingredient.key);
  }
  return keys;
}

function toCanonical(key: string, amount: number, unit: string): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const table = CONVERSIONS[key];
  const normalized = unit.trim().toLowerCase().replace(/µ|μ/g, 'u').replace(/\s+/g, ' ');
  if (!table) return amount;
  const factor = table[normalized];
  if (factor == null) return null;
  return amount * factor;
}
