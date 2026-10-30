/**
 * NIH DSLD v9 (https://api.ods.od.nih.gov/dsld/v9/).
 * Barcodes are stored with spaces ("0 88395 05611 6"). A bare digit string does not match.
 * Many labels leave upcSku empty, and CFU is often only in the ingredient notes.
 * Vitamin amounts sometimes disagree with the bottle name (400 IU on the name, 268 mg in the row).
 * The structured row is what we keep.
 */

export const DSLD_ORIGIN = 'https://api.ods.od.nih.gov/dsld/v9';
export const DSLD_ATTRIBUTION =
  'National Institutes of Health, Office of Dietary Supplements. Dietary Supplement Label Database, 2026. https://dsld.od.nih.gov/.';
export const DSLD_HOURLY_CAP = 800;

export const LABEL_UNITS = [
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

export type LabelUnit = (typeof LABEL_UNITS)[number];

export type NormalisedIngredient = {
  key: string;
  name: string;
  amount: number;
  unit: LabelUnit;
  costWeight: number;
};

export type NormalisedLabel = {
  dsldId: string | null;
  name: string;
  brand: string;
  upc: string | null;
  servingSize: string;
  servingsPerContainer: number;
  servingsPerDay: number;
  servingsCounted: boolean;
  ingredients: NormalisedIngredient[];
  source: 'dsld' | 'user';
};

export type LabelHit = {
  dsldId: string;
  name: string;
  brand: string;
  keyIngredients: string[];
  offMarket: boolean;
};

export class DsldBudgetError extends Error {
  constructor() {
    super('budget');
    this.name = 'DsldBudgetError';
  }
}

const GROUP_KEYS: Record<string, string> = {
  'vitamin d': 'vitamin-d',
  'vitamin a': 'vitamin-a',
  'vitamin e': 'vitamin-e',
  'vitamin c': 'vitamin-c',
  'vitamin b6': 'vitamin-b6',
  'vitamin b12': 'vitamin-b12',
  folate: 'folate',
  niacin: 'niacin',
  choline: 'choline',
  calcium: 'calcium',
  iron: 'iron',
  zinc: 'zinc',
  magnesium: 'magnesium',
  selenium: 'selenium',
  iodine: 'iodine',
  copper: 'copper',
  manganese: 'manganese',
  molybdenum: 'molybdenum',
  boron: 'boron',
};

const SKIP_NUTRIENTS = new Set([
  'calories',
  'energy',
  'total fat',
  'saturated fat',
  'trans fat',
  'cholesterol',
  'sodium',
  'total carbohydrate',
  'total carbohydrates',
  'dietary fiber',
  'total sugars',
  'added sugars',
  'includes added sugars',
  'protein',
  'sugar',
  'sugars',
]);

const EXCIPIENTS = new Set([
  'cellulose',
  'microcrystalline cellulose',
  'magnesium stearate',
  'stearic acid',
  'silicon dioxide',
  'silica',
  'rice flour',
  'croscarmellose sodium',
  'croscarmellose',
  'hypromellose',
  'hydroxypropyl methylcellulose',
  'gelatin',
  'titanium dioxide',
  'carnauba wax',
  'pharmaceutical glaze',
  'ethylcellulose',
  'vegetable stearate',
  'vegetarian capsule',
  'capsule',
]);

const PREFERRED_CATEGORIES = new Set(['vitamin', 'mineral', 'bacteria', 'amino_acid', 'enzyme']);

type RawQuantity = { operator?: string | null; quantity?: number | null; unit?: string | null };
type RawRow = {
  name?: string | null;
  notes?: string | null;
  category?: string | null;
  ingredientGroup?: string | null;
  quantity?: RawQuantity[] | null;
  nestedRows?: RawRow[] | null;
  forms?: { name?: string | null }[] | null;
};

export function hourKey(now = new Date()): string {
  return now.toISOString().slice(0, 13);
}

export function upcDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export function upcMatches(stored: string | null | undefined, scanned: string): boolean {
  const left = upcDigits(stored);
  const right = upcDigits(scanned);
  if (left.length < 8 || right.length < 8) return false;
  return left === right || left.endsWith(right) || right.endsWith(left);
}

/** Queries that match how DSLD stores UPC-A, including an EAN-13 with a leading zero. */
export function upcLookupQueries(raw: string): string[] {
  const digits = upcDigits(raw);
  const queries: string[] = [];
  const add = (value: string) => {
    if (value && !queries.includes(value)) queries.push(value);
  };
  const twelve = digits.length === 12 ? digits : digits.length === 13 && digits.startsWith('0') ? digits.slice(1) : '';
  if (twelve.length === 12) {
    add(`${twelve[0]} ${twelve.slice(1, 6)} ${twelve.slice(6, 11)} ${twelve[11]}`);
  }
  if (digits.length >= 8) add(digits);
  return queries;
}

export function mapDose(quantity: number, unit: string, notes: string): { amount: number; unit: LabelUnit } | null {
  const fromNotes = doseFromNotes(notes);
  const cleaned = unit.trim().toLowerCase().replace(/µ|μ/g, 'u').replace(/\s+/g, ' ');
  if (!cleaned || cleaned === 'np' || cleaned === 'n/a') {
    return fromNotes;
  }
  if (/(^|\s)billion\s*cfu/.test(cleaned) || cleaned === 'cfu (billion)') {
    return finiteDose(quantity, 'CFU (billion)');
  }
  if (/million\s*cfu/.test(cleaned)) {
    return finiteDose(quantity / 1000, 'CFU (billion)');
  }
  if (cleaned === 'cfu' || cleaned === 'cfu(s)') {
    if (quantity >= 1_000_000) return finiteDose(quantity / 1_000_000_000, 'CFU (billion)');
    return fromNotes;
  }
  const direct: Record<string, LabelUnit> = {
    mg: 'mg',
    milligram: 'mg',
    'milligram(s)': 'mg',
    mcg: 'mcg',
    ug: 'mcg',
    'mcg dfe': 'mcg DFE',
    'ug dfe': 'mcg DFE',
    'mcg rae': 'mcg RAE',
    'ug rae': 'mcg RAE',
    'mg ne': 'mg NE',
    g: 'g',
    gram: 'g',
    grams: 'g',
    'gram(s)': 'g',
    iu: 'IU',
    'i.u.': 'IU',
    'i.u': 'IU',
    ml: 'mL',
    'ml(s)': 'mL',
    milliliter: 'mL',
    'milliliter(s)': 'mL',
    millilitre: 'mL',
  };
  const mapped = direct[cleaned];
  if (!mapped) return fromNotes;
  if (!Number.isFinite(quantity) || quantity <= 0) return fromNotes;
  return { amount: quantity, unit: mapped };
}

function finiteDose(amount: number, unit: LabelUnit): { amount: number; unit: LabelUnit } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit };
}

function doseFromNotes(notes: string): { amount: number; unit: LabelUnit } | null {
  const billion = notes.match(/(\d+(?:\.\d+)?)\s*billion\s*cfu/i);
  if (billion?.[1]) return finiteDose(Number(billion[1]), 'CFU (billion)');
  const million = notes.match(/(\d+(?:\.\d+)?)\s*million\s*cfu/i);
  if (million?.[1]) return finiteDose(Number(million[1]) / 1000, 'CFU (billion)');
  return null;
}

export function normaliseLabel(raw: unknown): NormalisedLabel | null {
  if (!raw || typeof raw !== 'object') return null;
  const label = raw as Record<string, unknown>;
  const name = stringField(label.fullName);
  if (!name) return null;
  const rows = Array.isArray(label.ingredientRows) ? (label.ingredientRows as RawRow[]) : [];
  const ingredients = rows.flatMap((row) => ingredientsFromRow(row)).slice(0, 40);
  const serving = Array.isArray(label.servingSizes) ? (label.servingSizes[0] as Record<string, unknown> | undefined) : undefined;
  const net = Array.isArray(label.netContents) ? (label.netContents[0] as Record<string, unknown> | undefined) : undefined;
  const counted = countServings(label.servingsPerContainer, serving, net);
  const perDay = positiveNumber(serving?.minDailyServings) ?? positiveNumber(serving?.maxDailyServings) ?? 1;
  const id = label.id == null ? null : String(label.id);
  return {
    dsldId: id,
    name,
    brand: stringField(label.brandName),
    upc: upcDigits(stringField(label.upcSku)) || null,
    servingSize: servingSizeLabel(serving),
    servingsPerContainer: counted.servings,
    servingsPerDay: perDay,
    servingsCounted: counted.counted,
    ingredients,
    source: 'dsld',
  };
}

export function hitsFromSearch(raw: unknown): LabelHit[] {
  if (!raw || typeof raw !== 'object') return [];
  const hits = (raw as { hits?: unknown }).hits;
  if (!Array.isArray(hits)) return [];
  const out: LabelHit[] = [];
  for (const hit of hits) {
    if (!hit || typeof hit !== 'object') continue;
    const row = hit as { _id?: unknown; _source?: Record<string, unknown> };
    const source = row._source ?? {};
    const name = stringField(source.fullName);
    const id = row._id == null ? '' : String(row._id);
    if (!name || !id) continue;
    const ingredients = Array.isArray(source.allIngredients) ? (source.allIngredients as RawRow[]) : [];
    out.push({
      dsldId: id,
      name,
      brand: stringField(source.brandName),
      keyIngredients: keyIngredientNames(ingredients),
      offMarket: Boolean(source.offMarket),
    });
    if (out.length >= 8) break;
  }
  return out;
}

export function keyIngredientNames(rows: { name?: string | null; category?: string | null; ingredientGroup?: string | null }[]): string[] {
  const preferred: string[] = [];
  const grouped: string[] = [];
  for (const row of rows) {
    const name = (row.name ?? '').trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (SKIP_NUTRIENTS.has(lower) || EXCIPIENTS.has(lower)) continue;
    const category = (row.category ?? '').toLowerCase();
    const group = (row.ingredientGroup ?? '').trim().toLowerCase();
    if (PREFERRED_CATEGORIES.has(category)) preferred.push(name);
    else if (GROUP_KEYS[group]) grouped.push(name);
  }
  const unique: string[] = [];
  for (const name of [...preferred, ...grouped]) {
    if (unique.some((item) => item.toLowerCase() === name.toLowerCase())) continue;
    unique.push(name);
    if (unique.length === 3) break;
  }
  return unique;
}

export function parseUserLabel(body: unknown, upc: string): NormalisedLabel | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  const name = stringField(raw.name);
  if (!name || name.length > 160) return null;
  const digits = upcDigits(upc);
  if (raw.upc != null && upcDigits(String(raw.upc)) !== digits) return null;
  const servingsPerContainer = positiveNumber(raw.servingsPerContainer);
  const servingsPerDay = positiveNumber(raw.servingsPerDay);
  if (!servingsPerContainer || !servingsPerDay) return null;
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0 || raw.ingredients.length > 40) return null;
  const ingredients: NormalisedIngredient[] = [];
  for (const item of raw.ingredients) {
    if (!item || typeof item !== 'object') return null;
    const ingredient = item as Record<string, unknown>;
    const ingredientName = stringField(ingredient.name);
    const unit = ingredient.unit;
    const amount = typeof ingredient.amount === 'number' ? ingredient.amount : Number.NaN;
    if (!ingredientName || !Number.isFinite(amount) || amount <= 0) return null;
    if (typeof unit !== 'string' || !LABEL_UNITS.includes(unit as LabelUnit)) return null;
    ingredients.push({
      key: stringField(ingredient.key) || slug(ingredientName),
      name: ingredientName,
      amount,
      unit: unit as LabelUnit,
      costWeight: 1,
    });
  }
  return {
    dsldId: null,
    name,
    brand: stringField(raw.brand),
    upc: digits,
    servingSize: stringField(raw.servingSize) || '1 serving',
    servingsPerContainer,
    servingsPerDay,
    servingsCounted: true,
    ingredients,
    source: 'user',
  };
}

function ingredientsFromRow(row: RawRow): NormalisedIngredient[] {
  const dose = doseOf(row);
  if (dose) {
    const name = displayName(row);
    if (!name || SKIP_NUTRIENTS.has(name.toLowerCase())) return [];
    return [
      {
        key: ingredientKey(row, name),
        name,
        amount: dose.amount,
        unit: dose.unit,
        costWeight: 1,
      },
    ];
  }
  const nested = (row.nestedRows ?? []).flatMap((child) => ingredientsFromRow(child));
  if (nested.length > 0) return nested;
  if ((row.category ?? '').toLowerCase() === 'blend') {
    const name = (row.name ?? '').trim();
    if (!name) return [];
    return [{ key: ingredientKey(row, name), name, amount: 1, unit: 'other', costWeight: 1 }];
  }
  return [];
}

function doseOf(row: RawRow): { amount: number; unit: LabelUnit } | null {
  const notes = row.notes ?? '';
  for (const quantity of row.quantity ?? []) {
    const operator = (quantity.operator ?? '=').trim();
    if (operator && operator !== '=' && operator !== '~' && operator.toLowerCase() !== 'approx') continue;
    const amount = typeof quantity.quantity === 'number' ? quantity.quantity : Number.NaN;
    const mapped = mapDose(amount, quantity.unit ?? '', notes);
    if (mapped) return mapped;
  }
  return doseFromNotes(notes);
}

function displayName(row: RawRow): string {
  const name = (row.name ?? '').trim();
  const form = (row.forms ?? []).map((item) => (item.name ?? '').trim()).find((item) => item && item.toLowerCase() !== name.toLowerCase());
  if (!name) return form ?? '';
  if (!form) return name;
  return `${name} (${form})`;
}

function ingredientKey(row: RawRow, name: string): string {
  const group = (row.ingredientGroup ?? '').trim().toLowerCase();
  return GROUP_KEYS[group] ?? slug(group || name);
}

function countServings(
  direct: unknown,
  serving: Record<string, unknown> | undefined,
  net: Record<string, unknown> | undefined,
): { servings: number; counted: boolean } {
  const listed = positiveNumber(direct);
  if (listed) return { servings: Math.round(listed), counted: true };
  const per = positiveNumber(serving?.minQuantity);
  const count = positiveNumber(net?.quantity);
  const servingUnit = stringField(serving?.unit);
  const netUnit = stringField(net?.unit);
  if (per && count && looksLikeCount(servingUnit) && looksLikeCount(netUnit)) {
    return { servings: Math.max(1, Math.round(count / per)), counted: true };
  }
  return { servings: 30, counted: false };
}

function looksLikeCount(unit: string): boolean {
  return /capsule|tablet|softgel|gummy|lozenge|caplet|pill|packet|chew/i.test(unit);
}

function servingSizeLabel(serving: Record<string, unknown> | undefined): string {
  if (!serving) return '1 serving';
  const quantity = positiveNumber(serving.minQuantity) ?? positiveNumber(serving.maxQuantity);
  const unit = stringField(serving.unit);
  if (!quantity || !unit) return '1 serving';
  return `${formatQty(quantity)} ${pluralUnit(unit, quantity)}`;
}

function pluralUnit(unit: string, count: number): string {
  // DSLD writes "Gummy(ies)" and "Tablet(s)": the letters before the parenthesis are already the singular.
  const one = unit.replace(/\(ies\)/gi, '').replace(/\(s\)/gi, '').replace(/\s+/g, ' ').trim();
  if (count === 1) return one;
  if (/[^aeiou]y$/i.test(one)) return `${one.slice(0, -1)}ies`;
  if (one.endsWith('s')) return one;
  return `${one}s`;
}

function formatQty(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

function positiveNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ingredient';
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function loadSearch(db: D1Database, fetcher: Fetcher, query: string): Promise<LabelHit[]> {
  const q = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  return cached(db, `search:${q.toLowerCase()}`, 24 * 60 * 60 * 1000, async () => {
    const onMarket = hitsFromSearch(await upstream(db, fetcher, searchUrl(q, '1')));
    if (onMarket.length > 0) return onMarket;
    return hitsFromSearch(await upstream(db, fetcher, searchUrl(q, '2')));
  });
}

export async function loadDsldLabel(db: D1Database, fetcher: Fetcher, id: string): Promise<NormalisedLabel | null> {
  return cached(db, `label:${id}`, 7 * 24 * 60 * 60 * 1000, async () => {
    const raw = await upstream(db, fetcher, `${DSLD_ORIGIN}/label/${encodeURIComponent(id)}`);
    return normaliseLabel(raw);
  });
}

export async function loadUpc(db: D1Database, fetcher: Fetcher, rawCode: string): Promise<{ found: boolean; upc: string; label: NormalisedLabel | null }> {
  const digits = upcDigits(rawCode);
  return cached(db, `upc:${digits}`, 24 * 60 * 60 * 1000, async () => {
    const ids: string[] = [];
    for (const query of upcLookupQueries(digits)) {
      const payload = await upstream(db, fetcher, searchUrl(`"${query}"`, '2'));
      for (const hit of hitsFromSearch(payload)) {
        if (!ids.includes(hit.dsldId)) ids.push(hit.dsldId);
      }
      if (ids.length > 0) break;
    }
    for (const id of ids.slice(0, 4)) {
      const label = await loadDsldLabel(db, fetcher, id);
      if (label && upcMatches(label.upc, digits)) return { found: true, upc: digits, label };
    }
    return { found: false, upc: digits, label: null };
  });
}

function searchUrl(q: string, status: string): string {
  const params = [
    ['q', q],
    ['size', '8'],
    ['status', status],
    ['sort', '_score'],
  ]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${DSLD_ORIGIN}/search-filter?${params}`;
}

async function upstream(db: D1Database, fetcher: Fetcher, url: string): Promise<unknown> {
  if (!(await takeBudget(db))) throw new DsldBudgetError();
  const response = await fetcher(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`DSLD responded ${response.status}`);
  return response.json();
}

async function takeBudget(db: D1Database): Promise<boolean> {
  const hour = hourKey();
  const row = await db.prepare('SELECT requests FROM dsld_budget WHERE hour_key = ?').bind(hour).first<{ requests: number }>();
  if ((row?.requests ?? 0) >= DSLD_HOURLY_CAP) return false;
  await db
    .prepare(
      `INSERT INTO dsld_budget (hour_key, requests) VALUES (?, 1)
       ON CONFLICT(hour_key) DO UPDATE SET requests = requests + 1`,
    )
    .bind(hour)
    .run();
  return true;
}

async function cached<T>(db: D1Database, key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const fresh = await readCache(db, key, ttlMs);
  if (fresh != null) return JSON.parse(fresh) as T;
  try {
    const value = await load();
    await writeCache(db, key, JSON.stringify(value), Math.round(ttlMs / 1000));
    return value;
  } catch (error) {
    const stale = await readCache(db, key, Number.POSITIVE_INFINITY);
    if (stale != null) return JSON.parse(stale) as T;
    throw error;
  }
}

async function readCache(db: D1Database, key: string, maxAgeMs: number): Promise<string | null> {
  const edge = await readEdge(key);
  if (edge != null && maxAgeMs < Number.POSITIVE_INFINITY) return edge;
  const row = await db.prepare('SELECT payload, fetched_at FROM dsld_cache WHERE cache_key = ?').bind(key).first<{ payload: string; fetched_at: string }>();
  if (!row) return null;
  const age = Date.now() - Date.parse(row.fetched_at);
  if (!Number.isFinite(age) || age > maxAgeMs) return null;
  return row.payload;
}

async function writeCache(db: D1Database, key: string, payload: string, ttlSeconds: number): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO dsld_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
    )
    .bind(key, payload, now)
    .run();
  await writeEdge(key, payload, ttlSeconds);
}

function edgeCache(): Cache | null {
  try {
    return caches.default;
  } catch {
    return null;
  }
}

function edgeRequest(key: string): Request {
  return new Request(`https://stack-dsld-cache.internal/${encodeURIComponent(key)}`);
}

async function readEdge(key: string): Promise<string | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(edgeRequest(key));
    return hit ? hit.text() : null;
  } catch {
    return null;
  }
}

async function writeEdge(key: string, payload: string, ttlSeconds: number): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(edgeRequest(key), new Response(payload, { headers: { 'cache-control': `max-age=${ttlSeconds}` } }));
  } catch {
    // The Cache API is not available in tests or local node.
  }
}
