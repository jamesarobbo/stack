/**
 * Label units for an ingredient amount.
 * `other` is for a proprietary blend that is not a measured dose.
 */
export const UNIT_OPTIONS = [
  'mg',
  'mcg',
  'g',
  'IU',
  'mcg DFE',
  'mcg RAE',
  'mg NE',
  'CFU (billion)',
  'mL',
  'other',
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number];

export const DEFAULT_UNIT: UnitOption = 'mg';

/** Lowercase key used by the audit conversion tables. */
export function normalizeUnit(unit: string): string {
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

const ALIASES: Record<string, UnitOption> = {
  mg: 'mg',
  mcg: 'mcg',
  g: 'g',
  iu: 'IU',
  'mcg dfe': 'mcg DFE',
  'mcg rae': 'mcg RAE',
  'mg ne': 'mg NE',
  cfu: 'CFU (billion)',
  ml: 'mL',
  other: 'other',
};

/** Map a stored or typed unit onto a picker option. Unknown values become `other`. */
export function coerceUnit(value: string | null | undefined): UnitOption {
  const raw = (value ?? '').trim();
  if (!raw) return DEFAULT_UNIT;
  const direct = UNIT_OPTIONS.find((option) => option.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;
  return ALIASES[normalizeUnit(raw)] ?? 'other';
}

/** Short label for pickers and readouts. Stored value stays the UnitOption string. */
const UNIT_DISPLAY_LABELS: Record<UnitOption, string> = {
  mg: 'mg',
  mcg: 'mcg',
  g: 'g',
  IU: 'IU',
  'mcg DFE': 'mcg DFE',
  'mcg RAE': 'mcg RAE',
  'mg NE': 'mg NE',
  'CFU (billion)': 'B CFU',
  mL: 'mL',
  other: 'other',
};

export function unitDisplayLabel(unit: string): string {
  const option = coerceUnit(unit);
  return UNIT_DISPLAY_LABELS[option] ?? option;
}

