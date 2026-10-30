/**
 * Dose-only audit score. See docs/audit-score.md.
 * This does not use price. The Pro savings score is a separate dollar figure.
 */

import { UPPER_LIMITS } from '../data/upperLimits';
import { toCanonical } from './audit';

export type ScoreIngredient = { key: string; amount: number; unit: string };
export type ScoreProduct = { id: string; servingsPerDay: number; ingredients: ScoreIngredient[] };

const WEIGHTS = { extraProduct: 12, over: 20, near: 8, redundant: 15 };
const CAPS = { duplicate: 48, limit: 40, redundant: 30 };

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
    if (keys.every((key) => (byKey.get(key)?.size ?? 0) >= 2)) count += 1;
  }
  return count;
}

function limitPoints(products: ScoreProduct[]): number {
  const totals = new Map<string, number>();
  for (const product of products) {
    const perDay = Number.isFinite(product.servingsPerDay) && product.servingsPerDay > 0 ? product.servingsPerDay : 0;
    for (const ingredient of product.ingredients) {
      if (!UPPER_LIMITS.some((row) => row.key === ingredient.key)) continue;
      const canonical = toCanonical(ingredient.key, ingredient.amount * perDay, ingredient.unit);
      if (!canonical) continue;
      totals.set(ingredient.key, (totals.get(ingredient.key) ?? 0) + canonical.amount);
    }
  }
  let points = 0;
  for (const row of UPPER_LIMITS) {
    const total = totals.get(row.key);
    if (total == null) continue;
    if (total > row.ul) points += WEIGHTS.over;
    else if (total >= row.ul * row.nearFrom) points += WEIGHTS.near;
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
