/**
 * Dose-only audit score. See docs/audit-score.md.
 * One implementation: the app previews with it and the Worker stores the published number.
 * Price is not an input.
 */

import { DOSE_LIMITS, doseLimitFor, formatDose, normalizeDoseUnit, toCanonicalDose } from './doses';

export type ScoreIngredient = {
  key: string;
  name?: string;
  amount: number;
  unit: string;
  family?: string;
  familyLabel?: string;
};
export type ScoreProduct = { id: string; name?: string; servingsPerDay: number; ingredients: ScoreIngredient[] };

export const SCORE_WEIGHTS = { over: 20, near: 5, doubled: 8 } as const;
export const SCORE_CAPS = { over: 40, near: 15, doubled: 24 } as const;

export type ScoreReasonKind = 'over' | 'near' | 'doubled' | 'overlap_ok' | 'unchecked';

export type ScoreReason = { kind: ScoreReasonKind; key: string; text: string; points: number };

export type DailyTotal = {
  key: string;
  name: string;
  amount: number;
  unit: string;
  products: number;
  /** Daily total divided by the upper limit, or null when there is no limit or the unit is not checked. */
  ofLimit: number | null;
  limit: { ul: number; unit: string } | null;
};

export type ScoreResult = {
  score: number;
  /** Plain reasons, for example "2 above the upper limit, 1 doubled up". */
  summary: string;
  reasons: ScoreReason[];
  totals: DailyTotal[];
  /** True when any ingredient is above twice its upper limit. Such stacks stay out of Discover. */
  overTwiceLimit: boolean;
  parts: { over: number; near: number; doubled: number };
};

type KeyTotal = {
  key: string;
  name: string;
  checked: number;
  rawAmount: number;
  rawUnit: string | null;
  mixedUnits: boolean;
  unchecked: string[];
  productIds: Set<string>;
};

export function auditScore(products: ScoreProduct[]): number {
  return scoreStack(products).score;
}

export function scoreStack(products: ScoreProduct[]): ScoreResult {
  const byKey = new Map<string, KeyTotal>();
  const byFamily = new Map<string, { label: string; keys: Set<string>; productIds: Set<string> }>();

  for (const product of products) {
    const perDay = Number.isFinite(product.servingsPerDay) && product.servingsPerDay > 0 ? product.servingsPerDay : 0;
    for (const ingredient of product.ingredients) {
      if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) continue;
      const key = ingredient.key.trim() || (ingredient.name ?? '').trim().toLowerCase();
      if (!key) continue;
      const name = doseLimitFor(key)?.name ?? ingredient.name ?? key;
      const total =
        byKey.get(key) ??
        ({ key, name, checked: 0, rawAmount: 0, rawUnit: null, mixedUnits: false, unchecked: [], productIds: new Set<string>() } satisfies KeyTotal);
      total.productIds.add(product.id);
      const daily = ingredient.amount * perDay;
      const unit = normalizeDoseUnit(ingredient.unit);
      if (total.rawUnit == null) total.rawUnit = unit;
      else if (total.rawUnit !== unit) total.mixedUnits = true;
      total.rawAmount += daily;
      if (doseLimitFor(key)) {
        const canonical = toCanonicalDose(key, daily, ingredient.unit);
        if (canonical) total.checked += canonical.amount;
        else if (daily > 0 && !total.unchecked.includes(ingredient.unit)) total.unchecked.push(ingredient.unit);
      }
      byKey.set(key, total);

      const family = (ingredient.family ?? key).trim() || key;
      const group = byFamily.get(family) ?? { label: ingredient.familyLabel ?? name, keys: new Set<string>(), productIds: new Set<string>() };
      group.keys.add(key);
      group.productIds.add(product.id);
      byFamily.set(family, group);
    }
  }

  const reasons: ScoreReason[] = [];
  const totals: DailyTotal[] = [];
  let overTwiceLimit = false;
  const flaggedKeys = new Set<string>();

  for (const limit of DOSE_LIMITS) {
    const total = byKey.get(limit.key);
    if (!total) continue;
    if (total.unchecked.length > 0) {
      reasons.push({
        kind: 'unchecked',
        key: limit.key,
        text: `${limit.name} in ${total.unchecked.join(' and ')} is not checked against the limit`,
        points: 0,
      });
    }
    if (total.checked <= 0) continue;
    const amount = `${formatDose(total.checked)} ${limit.unit}`;
    const ul = `${formatDose(limit.ul)} ${limit.unit}`;
    if (total.checked > limit.ul * 2) overTwiceLimit = true;
    if (total.checked > limit.ul) {
      flaggedKeys.add(limit.key);
      reasons.push({ kind: 'over', key: limit.key, text: `${limit.name} ${amount} a day, above the ${ul} upper limit`, points: SCORE_WEIGHTS.over });
    } else if (total.checked >= limit.ul * limit.nearFrom) {
      flaggedKeys.add(limit.key);
      reasons.push({ kind: 'near', key: limit.key, text: `${limit.name} ${amount} a day, close to the ${ul} upper limit`, points: SCORE_WEIGHTS.near });
    }
  }

  for (const [family, group] of byFamily) {
    const count = group.productIds.size;
    if (count < 2) continue;
    const keys = [...group.keys];
    const hasLimit = keys.some((key) => doseLimitFor(key));
    if (keys.some((key) => flaggedKeys.has(key))) continue;
    if (hasLimit) {
      reasons.push({ kind: 'overlap_ok', key: family, text: `${group.label} is in ${count} products, within the limit in total`, points: 0 });
      continue;
    }
    reasons.push({ kind: 'doubled', key: family, text: `${group.label} is in ${count} products`, points: SCORE_WEIGHTS.doubled * (count - 1) });
  }

  for (const total of byKey.values()) {
    const limit = doseLimitFor(total.key);
    const checked = limit && total.checked > 0;
    totals.push({
      key: total.key,
      name: total.name,
      amount: checked ? total.checked : total.rawAmount,
      unit: checked && limit ? limit.unit : displayUnit(total.mixedUnits ? null : total.rawUnit),
      products: total.productIds.size,
      ofLimit: checked && limit ? total.checked / limit.ul : null,
      limit: limit ? { ul: limit.ul, unit: limit.unit } : null,
    });
  }
  totals.sort((a, b) => (b.ofLimit ?? -1) - (a.ofLimit ?? -1) || a.name.localeCompare(b.name));

  const sum = (kind: ScoreReasonKind) => reasons.filter((reason) => reason.kind === kind).reduce((total, reason) => total + reason.points, 0);
  const parts = {
    over: Math.min(SCORE_CAPS.over, sum('over')),
    near: Math.min(SCORE_CAPS.near, sum('near')),
    doubled: Math.min(SCORE_CAPS.doubled, sum('doubled')),
  };
  const score = Math.max(0, Math.min(100, 100 - parts.over - parts.near - parts.doubled));
  return { score, summary: summarise(reasons), reasons, totals, overTwiceLimit, parts };
}

export function summarise(reasons: ScoreReason[]): string {
  const count = (kind: ScoreReasonKind) => reasons.filter((reason) => reason.kind === kind).length;
  const parts: string[] = [];
  const over = count('over');
  const near = count('near');
  const doubled = count('doubled');
  if (over > 0) parts.push(`${over} above the upper limit`);
  if (near > 0) parts.push(`${near} close to the upper limit`);
  if (doubled > 0) parts.push(`${doubled} doubled up`);
  if (parts.length === 0) return 'No doses above the upper limit and nothing doubled up';
  return capitalise(parts.join(', '));
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function displayUnit(unit: string | null): string {
  if (!unit) return '';
  if (unit === 'iu') return 'IU';
  if (unit === 'mcg dfe') return 'mcg DFE';
  if (unit === 'mcg rae') return 'mcg RAE';
  if (unit === 'mg ne') return 'mg NE';
  if (unit === 'ml') return 'mL';
  if (unit === 'cfu') return 'CFU (billion)';
  return unit;
}
