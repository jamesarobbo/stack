import { INTERACTION_RULES } from '../data/interactions';
import { UPPER_LIMITS } from '../data/upperLimits';
import { formatNumber, formatUsd } from '../format';
import type { IngredientInput, ProductInput } from './types';

const CONVERSIONS: Record<string, Record<string, number>> = {
  'vitamin-d': { iu: 1, mcg: 40, ug: 40, mg: 40_000 },
  'vitamin-a': { mcg: 1, ug: 1, iu: 0.3, mg: 1000 },
  'vitamin-e': { mg: 1, iu: 0.67 },
  'vitamin-c': { mg: 1, g: 1000 },
  'vitamin-b6': { mg: 1, mcg: 0.001 },
  folate: { mcg: 1, ug: 1, mg: 1000 },
  niacin: { mg: 1, mcg: 0.001 },
  choline: { mg: 1, g: 1000 },
  calcium: { mg: 1, g: 1000 },
  iron: { mg: 1, mcg: 0.001 },
  zinc: { mg: 1, mcg: 0.001 },
  magnesium: { mg: 1, g: 1000, mcg: 0.001 },
  selenium: { mcg: 1, ug: 1, mg: 1000 },
  iodine: { mcg: 1, ug: 1, mg: 1000 },
  copper: { mg: 1, mcg: 0.001 },
  manganese: { mg: 1, mcg: 0.001 },
  molybdenum: { mcg: 1, ug: 1, mg: 1000 },
  boron: { mg: 1, mcg: 0.001 },
  'vitamin-b12': { mcg: 1, ug: 1, mg: 1000 },
};

export type CostShare = {
  productId: string;
  productName: string;
  family: string;
  label: string;
  summary: string;
  cents: number;
  amount: number | null;
  unit: string | null;
};

export type DuplicateFinding = {
  family: string;
  label: string;
  detail: string;
  wastedCents: number;
  sources: CostShare[];
};

export type LimitLevel = 'near' | 'over';

export type LimitFinding = {
  key: string;
  name: string;
  level: LimitLevel;
  total: number;
  unit: string;
  ul: number;
  message: string;
  citation: string;
  sourceUrl: string;
};

export type InteractionFinding = {
  id: string;
  message: string;
};

export type AuditResult = {
  monthlySpendCents: number;
  wastedCents: number;
  duplicates: DuplicateFinding[];
  limits: LimitFinding[];
  interactions: InteractionFinding[];
  subtitle: string;
};

export function normalizeUnit(unit: string): string {
  const cleaned = unit.trim().toLowerCase().replace('µ', 'u');
  if (cleaned === 'ug' || cleaned === 'μg') return 'mcg';
  if (cleaned === 'iu') return 'iu';
  return cleaned;
}

export function monthlyCostCents(
  priceCents: number,
  servingsPerContainer: number,
  servingsPerDay: number,
  days = 30,
): number {
  if (priceCents <= 0 || servingsPerContainer <= 0 || servingsPerDay <= 0 || days <= 0) return 0;
  return Math.round((priceCents / servingsPerContainer) * servingsPerDay * days);
}

export function toCanonical(key: string, amount: number, unit: string): { amount: number; unit: string } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const table = CONVERSIONS[key];
  const normalized = normalizeUnit(unit);
  if (!table) return { amount, unit: normalized };
  const factor = table[normalized];
  if (factor == null) return null;
  const canonicalUnit = Object.entries(table).find(([, value]) => value === 1)?.[0] ?? normalized;
  return { amount: amount * factor, unit: canonicalUnit };
}

function familyOf(ingredient: IngredientInput): string {
  return ingredient.family ?? ingredient.key;
}

function labelOf(ingredient: IngredientInput): string {
  return ingredient.familyLabel ?? ingredient.name;
}

export function costShares(product: ProductInput): CostShare[] {
  const monthly = monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay);
  const weights = product.ingredients.map((ingredient) => Math.max(0, ingredient.costWeight));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  return product.ingredients.map((ingredient, index) => {
    const weight = weights[index] ?? 0;
    const cents = weightSum > 0 ? Math.round((monthly * weight) / weightSum) : 0;
    const canonical = toCanonical(ingredient.key, ingredient.amount, ingredient.unit);
    return {
      productId: product.id,
      productName: product.name,
      family: familyOf(ingredient),
      label: labelOf(ingredient),
      summary: ingredient.summary ?? `${product.name} ${formatNumber(ingredient.amount)} ${ingredient.unit}`,
      cents,
      amount: canonical?.amount ?? null,
      unit: canonical?.unit ?? null,
    };
  });
}

export function auditStack(products: ProductInput[]): AuditResult {
  const monthlySpendCents = products.reduce(
    (sum, product) => sum + monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay),
    0,
  );
  const shares = products.flatMap(costShares);
  const duplicates = duplicateFindings(shares);
  const wastedCents = duplicates.reduce((sum, finding) => sum + finding.wastedCents, 0);
  return {
    monthlySpendCents,
    wastedCents,
    duplicates,
    limits: limitFindings(products),
    interactions: interactionFindings(products),
    subtitle: savingsSubtitle(duplicates),
  };
}

function duplicateFindings(shares: CostShare[]): DuplicateFinding[] {
  const groups = new Map<string, CostShare[]>();
  for (const share of shares) {
    if (share.cents <= 0) continue;
    const list = groups.get(share.family) ?? [];
    list.push(share);
    groups.set(share.family, list);
  }

  const findings: DuplicateFinding[] = [];
  for (const [family, group] of groups) {
    const productIds = new Set(group.map((share) => share.productId));
    if (productIds.size < 2) continue;
    const maxCents = Math.max(...group.map((share) => share.cents));
    const wastedCents = group.filter((share) => share.cents < maxCents).reduce((sum, share) => sum + share.cents, 0);
    if (wastedCents <= 0) continue;
    const ordered = [...group].sort((a, b) => b.cents - a.cents);
    findings.push({
      family,
      label: ordered[0]?.label ?? family,
      detail: ordered.map((share) => share.summary).join(' + '),
      wastedCents,
      sources: ordered,
    });
  }
  return findings.sort((a, b) => a.wastedCents - b.wastedCents);
}

export function limitFindings(products: ProductInput[]): LimitFinding[] {
  const totals = new Map<string, number>();
  for (const product of products) {
    const perDay = product.servingsPerDay;
    for (const ingredient of product.ingredients) {
      const canonical = toCanonical(ingredient.key, ingredient.amount * Math.max(perDay, 0), ingredient.unit);
      if (!canonical) continue;
      if (!UPPER_LIMITS.some((row) => row.key === ingredient.key)) continue;
      totals.set(ingredient.key, (totals.get(ingredient.key) ?? 0) + canonical.amount);
    }
  }

  const findings: LimitFinding[] = [];
  for (const row of UPPER_LIMITS) {
    const total = totals.get(row.key);
    if (total == null) continue;
    let level: LimitLevel | null = null;
    if (total > row.ul) level = 'over';
    else if (total >= row.ul * row.nearFrom) level = 'near';
    if (!level) continue;
    const totalLabel = `${formatNumber(total)} ${row.unit}`;
    const ulLabel = `${formatNumber(row.ul)} ${row.unit}`;
    const relation = level === 'over' ? 'above' : 'near';
    findings.push({
      key: row.key,
      name: row.name,
      level,
      total,
      unit: row.unit,
      ul: row.ul,
      citation: row.citation,
      sourceUrl: row.sourceUrl,
      message: `${row.name} ${totalLabel} daily is ${relation} the NIH ODS upper limit (${ulLabel}). Soft flag with citation. Discuss with a clinician. Not a dosing recommendation.`,
    });
  }
  return findings;
}

export function interactionFindings(products: ProductInput[]): InteractionFinding[] {
  const keys = new Set(products.flatMap((product) => product.ingredients.map((ingredient) => ingredient.key)));
  return INTERACTION_RULES.filter((rule) => rule.allOf.every((key) => keys.has(key))).map((rule) => ({
    id: rule.id,
    message: rule.message,
  }));
}

export function savingsSubtitle(duplicates: DuplicateFinding[]): string {
  if (duplicates.length === 0) return 'No duplicate ingredients in this stack.';
  const names = duplicates.map((finding) => friendlyDuplicateName(finding.label));
  const list = joinAnd(names);
  const verb = names.length > 1 || (names[0]?.endsWith('s') ?? false) ? 'appear' : 'appears';
  return `${list} ${verb} in more than one bottle. Example estimate only.`;
}

function friendlyDuplicateName(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('b-complex') || lower.includes('b6') || lower.includes('b12')) return 'B vitamins';
  return label;
}

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function productWastedCents(productId: string, result: AuditResult): number {
  return result.duplicates.reduce((sum, finding) => {
    const mine = finding.sources.filter((source) => source.productId === productId && source.cents < Math.max(...finding.sources.map((s) => s.cents)));
    return sum + mine.reduce((inner, source) => inner + source.cents, 0);
  }, 0);
}

export function savingsScore(monthlySpendCents: number, wastedCents: number): number {
  if (monthlySpendCents <= 0) return 100;
  const ratio = Math.min(1, Math.max(0, wastedCents / monthlySpendCents));
  return Math.round(100 - ratio * 100);
}

export function formatWasted(cents: number): string {
  return `~${formatUsd(cents)}/mo`;
}
