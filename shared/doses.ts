/**
 * Dose units, conversions, and NIH Office of Dietary Supplements adult upper limits.
 * The app and the Worker both import this file, so the audit and the score agree.
 *
 * Multiply a label amount by the factor to reach the unit whose factor is 1.
 * Vitamin D: 1 mcg = 40 IU. Vitamin E (natural alpha-tocopherol): 1 IU = 0.67 mg.
 * Folate's upper limit is folic acid: 1 mcg DFE = 0.6 mcg folic acid.
 * Niacin mg NE uses the same milligram scale as the upper limit.
 * Vitamin A has no IU factor: the upper limit covers preformed retinol only, and an IU
 * amount can be beta-carotene, so an IU dose is reported as not checked.
 * CFU and mL are not a mass, so they are absent and never count toward a limit.
 */
export const DOSE_CONVERSIONS: Record<string, Record<string, number>> = {
  'vitamin-d': { iu: 1, mcg: 40, mg: 40_000, g: 40_000_000 },
  'vitamin-a': { mcg: 1, 'mcg rae': 1, mg: 1000, g: 1_000_000 },
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

export type DoseLimit = { key: string; name: string; unit: string; ul: number; nearFrom: number };

/** Adult upper limits. Magnesium's applies to supplements only. Vitamin A is preformed retinol. */
export const DOSE_LIMITS: DoseLimit[] = [
  { key: 'vitamin-d', name: 'Vitamin D', unit: 'IU', ul: 4000, nearFrom: 0.9 },
  { key: 'vitamin-a', name: 'Vitamin A', unit: 'mcg', ul: 3000, nearFrom: 0.9 },
  { key: 'vitamin-e', name: 'Vitamin E', unit: 'mg', ul: 1000, nearFrom: 0.9 },
  { key: 'vitamin-c', name: 'Vitamin C', unit: 'mg', ul: 2000, nearFrom: 0.9 },
  { key: 'vitamin-b6', name: 'Vitamin B6', unit: 'mg', ul: 100, nearFrom: 0.9 },
  { key: 'folate', name: 'Folate', unit: 'mcg', ul: 1000, nearFrom: 0.9 },
  { key: 'niacin', name: 'Niacin', unit: 'mg', ul: 35, nearFrom: 0.9 },
  { key: 'choline', name: 'Choline', unit: 'mg', ul: 3500, nearFrom: 0.9 },
  { key: 'calcium', name: 'Calcium', unit: 'mg', ul: 2500, nearFrom: 0.9 },
  { key: 'iron', name: 'Iron', unit: 'mg', ul: 45, nearFrom: 0.9 },
  { key: 'zinc', name: 'Zinc', unit: 'mg', ul: 40, nearFrom: 0.9 },
  { key: 'magnesium', name: 'Magnesium', unit: 'mg', ul: 350, nearFrom: 0.9 },
  { key: 'selenium', name: 'Selenium', unit: 'mcg', ul: 400, nearFrom: 0.9 },
  { key: 'iodine', name: 'Iodine', unit: 'mcg', ul: 1100, nearFrom: 0.9 },
  { key: 'copper', name: 'Copper', unit: 'mg', ul: 10, nearFrom: 0.9 },
  { key: 'manganese', name: 'Manganese', unit: 'mg', ul: 11, nearFrom: 0.9 },
  { key: 'molybdenum', name: 'Molybdenum', unit: 'mcg', ul: 2000, nearFrom: 0.9 },
  { key: 'boron', name: 'Boron', unit: 'mg', ul: 20, nearFrom: 0.9 },
];

export function doseLimitFor(key: string): DoseLimit | undefined {
  return DOSE_LIMITS.find((row) => row.key === key);
}

/** Lowercase key used by the conversion tables. */
export function normalizeDoseUnit(unit: string): string {
  const cleaned = unit
    .trim()
    .toLowerCase()
    .replace(/µ|μ/g, 'u')
    .replace(/\s+/g, ' ');
  if (cleaned === 'ug' || cleaned === 'mcg') return 'mcg';
  if (cleaned === 'iu' || cleaned === 'i.u.' || cleaned === 'i.u') return 'iu';
  if (cleaned === 'ml' || cleaned === 'milliliter' || cleaned === 'millilitre' || cleaned === 'milliliters' || cleaned === 'millilitres') {
    return 'ml';
  }
  if (cleaned === 'cfu' || cleaned === 'cfu (billion)' || cleaned === 'billion cfu') return 'cfu';
  if (cleaned === 'blend' || cleaned === 'proprietary blend') return 'other';
  if (cleaned === 'mcg dfe' || cleaned === 'ug dfe' || cleaned === 'dfe') return 'mcg dfe';
  if (cleaned === 'mcg rae' || cleaned === 'ug rae' || cleaned === 'rae') return 'mcg rae';
  if (cleaned === 'mg ne' || cleaned === 'ne') return 'mg ne';
  if (cleaned === 'gram' || cleaned === 'grams') return 'g';
  if (cleaned === 'milligram' || cleaned === 'milligrams') return 'mg';
  return cleaned;
}

/** Amount in the unit of the key's factor-1 entry, or null when the unit cannot be converted. */
export function toCanonicalDose(key: string, amount: number, unit: string): { amount: number; unit: string } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const table = DOSE_CONVERSIONS[key];
  const normalized = normalizeDoseUnit(unit);
  if (!table) return { amount, unit: normalized };
  const factor = table[normalized];
  if (factor == null) return null;
  const canonicalUnit = Object.entries(table).find(([, value]) => value === 1)?.[0] ?? normalized;
  return { amount: amount * factor, unit: canonicalUnit };
}

export function formatDose(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : value >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US');
}
