/**
 * Open Food Facts product lookup (https://world.openfoodfacts.org/api/v2/).
 * ODbL: keep this cache in its own table. Do not write these rows into dsld_cache
 * or any shared product catalogue.
 * Amounts come only from nutriments.<nutrient>_serving, which Open Food Facts stores in grams.
 * <nutrient>_unit is the unit the contributor typed, so any mass unit is accepted and the gram
 * value is rescaled. IU, percent of daily value, a dose in the product name, a per-100g figure,
 * and amounts above MAX_SERVING_GRAMS (a contributor typed micrograms into the gram field) are left blank.
 */

import { upcDigits, type LabelUnit, type NormalisedIngredient, type NormalisedLabel } from './dsld';

export const OFF_ORIGIN = 'https://world.openfoodfacts.org';
export const OFF_ATTRIBUTION = 'Product data from Open Food Facts, available under the ODbL';
export const OFF_TTL_MS = 24 * 60 * 60 * 1000;
const OFF_CONTACT_FALLBACK = 'https://github.com/jamesarobbo/stack';

const OFF_NUTRIENTS: Record<string, { key: string; name: string }> = {
  'vitamin-a': { key: 'vitamin-a', name: 'Vitamin A' },
  'vitamin-d': { key: 'vitamin-d', name: 'Vitamin D' },
  'vitamin-e': { key: 'vitamin-e', name: 'Vitamin E' },
  'vitamin-k': { key: 'vitamin-k', name: 'Vitamin K' },
  'vitamin-c': { key: 'vitamin-c', name: 'Vitamin C' },
  'vitamin-b1': { key: 'vitamin-b1', name: 'Vitamin B1' },
  'vitamin-b2': { key: 'vitamin-b2', name: 'Vitamin B2' },
  'vitamin-b6': { key: 'vitamin-b6', name: 'Vitamin B6' },
  'vitamin-b9': { key: 'folate', name: 'Folate' },
  'vitamin-b12': { key: 'vitamin-b12', name: 'Vitamin B12' },
  'vitamin-pp': { key: 'niacin', name: 'Niacin' },
  biotin: { key: 'biotin', name: 'Biotin' },
  'pantothenic-acid': { key: 'pantothenic-acid', name: 'Pantothenic acid' },
  calcium: { key: 'calcium', name: 'Calcium' },
  iron: { key: 'iron', name: 'Iron' },
  magnesium: { key: 'magnesium', name: 'Magnesium' },
  zinc: { key: 'zinc', name: 'Zinc' },
  selenium: { key: 'selenium', name: 'Selenium' },
  iodine: { key: 'iodine', name: 'Iodine' },
  copper: { key: 'copper', name: 'Copper' },
  manganese: { key: 'manganese', name: 'Manganese' },
  molybdenum: { key: 'molybdenum', name: 'Molybdenum' },
  boron: { key: 'boron', name: 'Boron' },
  chromium: { key: 'chromium', name: 'Chromium' },
  potassium: { key: 'potassium', name: 'Potassium' },
  phosphorus: { key: 'phosphorus', name: 'Phosphorus' },
  choline: { key: 'choline', name: 'Choline' },
  chloride: { key: 'chloride', name: 'Chloride' },
};

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export function offUserAgent(contact: string | undefined): string {
  const detail = contact?.trim() || OFF_CONTACT_FALLBACK;
  return `Stack/0.1 (${detail})`;
}

export function offProductUrl(code: string): string {
  return `${OFF_ORIGIN}/api/v2/product/${encodeURIComponent(code)}.json`;
}

/** Scanned digits, then a leading-zero or stripped-zero twin when the length is 12 or 13. */
export function offCodeVariants(raw: string): string[] {
  const digits = upcDigits(raw);
  const variants = [digits];
  if (digits.length === 12) variants.push(`0${digits}`);
  if (digits.length === 13 && digits.startsWith('0')) variants.push(digits.slice(1));
  return variants;
}

export function mapOffProduct(body: unknown, upc: string): NormalisedLabel | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  if (root.status === 0 || root.status === '0') return null;
  const product = root.product;
  if (!product || typeof product !== 'object') return null;
  const record = product as Record<string, unknown>;
  const name = text(record.product_name) || text(record.product_name_en);
  if (!name) return null;
  const servingRaw = text(record.serving_size);
  const quantityRaw = text(record.quantity);
  const counted = servingRaw ? countedServings(quantityRaw, servingRaw) : null;
  const nutriments = record.nutriments && typeof record.nutriments === 'object' ? (record.nutriments as Record<string, unknown>) : {};
  return {
    dsldId: null,
    name: name.slice(0, 160),
    brand: firstBrand(record.brands),
    upc: upcDigits(upc) || null,
    servingSize: servingSizeText(servingRaw, quantityRaw),
    servingsPerContainer: counted ?? 30,
    servingsPerDay: 1,
    servingsCounted: counted != null,
    ingredients: ingredientsFromNutriments(nutriments),
    source: 'off',
  };
}

export async function loadOffUpc(
  db: D1Database,
  fetcher: Fetcher,
  rawCode: string,
  userAgent: string,
): Promise<{ found: boolean; upc: string; label: NormalisedLabel | null }> {
  const digits = upcDigits(rawCode);
  const key = `off:${digits}`;
  const fresh = await readOff(db, key, OFF_TTL_MS);
  if (fresh != null) return JSON.parse(fresh) as { found: boolean; upc: string; label: NormalisedLabel | null };
  try {
    const label = await fetchOffLabel(fetcher, digits, userAgent);
    const result = { found: Boolean(label), upc: digits, label };
    await writeOff(db, key, JSON.stringify(result));
    return result;
  } catch {
    return { found: false, upc: digits, label: null };
  }
}

async function fetchOffLabel(fetcher: Fetcher, digits: string, userAgent: string): Promise<NormalisedLabel | null> {
  for (const code of offCodeVariants(digits)) {
    const response = await fetcher(offProductUrl(code), {
      headers: { accept: 'application/json', 'user-agent': userAgent },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`off ${response.status}`);
    const body = (await response.json()) as unknown;
    if (!body || typeof body !== 'object') throw new Error('off json');
    const status = (body as { status?: unknown }).status;
    if (status === 0 || status === '0') continue;
    const label = mapOffProduct(body, digits);
    if (label) return label;
  }
  return null;
}

function ingredientsFromNutriments(nutriments: Record<string, unknown>): NormalisedIngredient[] {
  const ingredients: NormalisedIngredient[] = [];
  for (const [offKey, meta] of Object.entries(OFF_NUTRIENTS)) {
    const dose = doseFromNutriments(nutriments, offKey);
    if (!dose) continue;
    ingredients.push({ key: meta.key, name: meta.name, amount: dose.amount, unit: dose.unit, costWeight: 1 });
    if (ingredients.length === 40) break;
  }
  return ingredients;
}

function doseFromNutriments(nutriments: Record<string, unknown>, offKey: string): { amount: number; unit: LabelUnit } | null {
  const serving = nutriments[`${offKey}_serving`];
  const unit = nutriments[`${offKey}_unit`];
  if (typeof serving !== 'number' || typeof unit !== 'string') return null;
  if (!isMassUnit(unit)) return null;
  if (serving > MAX_SERVING_GRAMS) return null;
  return gramsToLabel(serving);
}

const MAX_SERVING_GRAMS = 5;

function isMassUnit(unit: string): boolean {
  const cleaned = unit.trim().toLowerCase().replace(/µ|μ/g, 'u');
  return ['g', 'gram', 'grams', 'mg', 'milligram', 'milligrams', 'ug', 'mcg', 'microgram', 'micrograms'].includes(cleaned);
}

/** OFF stores vitamin and mineral `_serving` values in grams. The mass is rescaled, not reinterpreted. */
function gramsToLabel(grams: number): { amount: number; unit: LabelUnit } | null {
  if (!Number.isFinite(grams) || grams <= 0) return null;
  const scaled = grams >= 1 ? { amount: grams, unit: 'g' as const } : grams >= 0.001 ? { amount: grams * 1000, unit: 'mg' as const } : { amount: grams * 1_000_000, unit: 'mcg' as const };
  const amount = Number(scaled.amount.toPrecision(6));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit: scaled.unit };
}

function servingSizeText(serving: string, quantity: string): string {
  if (serving && quantity && serving.toLowerCase() !== quantity.toLowerCase()) return `${serving} (${quantity})`;
  return serving || quantity || '1 serving';
}

function countedServings(quantity: string, servingSize: string): number | null {
  const pack = quantity.trim().match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]+)\b/);
  const each = servingSize.trim().match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]+)\b/);
  if (!pack?.[1] || !pack[2] || !each?.[1] || !each[2]) return null;
  const packCount = Number(pack[1]);
  const eachCount = Number(each[1]);
  if (!Number.isFinite(packCount) || !Number.isFinite(eachCount) || packCount <= 0 || eachCount <= 0) return null;
  if (stem(pack[2]) !== stem(each[2])) return null;
  const servings = packCount / eachCount;
  if (!Number.isInteger(servings) || servings <= 0 || servings > 10_000) return null;
  return servings;
}

function stem(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith('ies') && lower.length > 3) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith('s') && lower.length > 1) return lower.slice(0, -1);
  return lower;
}

function firstBrand(value: unknown): string {
  if (typeof value === 'string') return value.split(',')[0]?.trim() ?? '';
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim());
    return typeof first === 'string' ? first.trim() : '';
  }
  return '';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function readOff(db: D1Database, key: string, maxAgeMs: number): Promise<string | null> {
  const row = await db.prepare('SELECT payload, fetched_at FROM off_cache WHERE cache_key = ?').bind(key).first<{ payload: string; fetched_at: string }>();
  if (!row) return null;
  const age = Date.now() - Date.parse(row.fetched_at);
  if (!Number.isFinite(age) || age > maxAgeMs) return null;
  return row.payload;
}

async function writeOff(db: D1Database, key: string, payload: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO off_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
    )
    .bind(key, payload, new Date().toISOString())
    .run();
}
