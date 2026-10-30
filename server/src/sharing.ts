import { randomId, randomToken } from './crypto';
import { auditScore, type ScoreProduct } from './auditScore';
import {
  aggregateOutcomes,
  isOutcomeMetric,
  personalOutcome,
  type AggregateResult,
  type DayValue,
  type OutcomeMetric,
  type OutcomeRow,
  type PersonalResult,
} from './outcome';
import { renderSharePage, type ShareView } from './sharePage';

export const AGE_RANGES = ['18_29', '30_39', '40_49', '50_59', '60_plus', 'unspecified'] as const;
export const SEXES = ['female', 'male', 'unspecified'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];
export type Sex = (typeof SEXES)[number];

export type StoredIngredient = { key: string; name: string; amount: number; unit: string };
export type StoredProduct = {
  id: string;
  name: string;
  brand: string;
  servingsPerContainer: number;
  servingsPerDay: number;
  ingredients: StoredIngredient[];
};

export type ShareSnapshot = {
  displayName: string | null;
  products: StoredProduct[];
  auditScore: number;
  result: PersonalResult | null;
};

type ShareRow = {
  id: string;
  user_id: string;
  slug: string;
  snapshot: string;
  public_index: number;
  revoked_at: string | null;
};

export function isAgeRange(value: unknown): value is AgeRange {
  return typeof value === 'string' && (AGE_RANGES as readonly string[]).includes(value);
}

export function isSex(value: unknown): value is Sex {
  return typeof value === 'string' && (SEXES as readonly string[]).includes(value);
}

export async function saveProfile(
  db: D1Database,
  userId: string,
  input: { ageRange?: unknown; sex?: unknown; displayName?: unknown },
): Promise<{ ageRange: string | null; sex: string | null; displayName: string | null }> {
  const ageRange = isAgeRange(input.ageRange) ? input.ageRange : null;
  const sex = isSex(input.sex) ? input.sex : null;
  const displayName = cleanName(input.displayName);
  await db
    .prepare('UPDATE users SET age_range = COALESCE(?, age_range), sex = COALESCE(?, sex), display_name = COALESCE(?, display_name) WHERE id = ?')
    .bind(ageRange, sex, displayName, userId)
    .run();
  const row = await db
    .prepare('SELECT age_range, sex, display_name FROM users WHERE id = ?')
    .bind(userId)
    .first<{ age_range: string | null; sex: string | null; display_name: string | null }>();
  return { ageRange: row?.age_range ?? null, sex: row?.sex ?? null, displayName: row?.display_name ?? null };
}

export async function readProfile(db: D1Database, userId: string) {
  return db
    .prepare('SELECT age_range, sex, display_name FROM users WHERE id = ?')
    .bind(userId)
    .first<{ age_range: string | null; sex: string | null; display_name: string | null }>();
}

export async function upsertShare(
  db: D1Database,
  userId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; share: ShareView } | { ok: false; error: string }> {
  const products = parseProducts(input.products);
  if (!products) return { ok: false, error: 'Add at least one product before sharing.' };
  const displayName = cleanName(input.displayName);
  const scored = auditScore(scoreInputs(products));
  const result = computeResult(input.result, typeof input.asOf === 'string' ? input.asOf : todayIso());
  if (input.result && result === 'invalid') return { ok: false, error: 'That personal result could not be read.' };
  if (input.result && result && typeof result === 'object' && result.eligible === false) {
    return { ok: false, error: result.reason };
  }
  const snapshot: ShareSnapshot = {
    displayName,
    products,
    auditScore: scored,
    result: result && typeof result === 'object' && result.eligible ? result : null,
  };
  const payload = JSON.stringify(snapshot);
  if (payload.length > 80_000) return { ok: false, error: 'That stack is too large to share.' };
  const now = new Date().toISOString();
  const publicIndex = input.publicIndex === true ? 1 : 0;
  const existing = await activeShare(db, userId);
  if (existing) {
    await db
      .prepare('UPDATE shares SET snapshot = ?, public_index = ?, updated_at = ? WHERE id = ?')
      .bind(payload, publicIndex, now, existing.id)
      .run();
    return { ok: true, share: await present(db, { ...existing, snapshot: payload, public_index: publicIndex }) };
  }
  const created: ShareRow = {
    id: randomId(),
    user_id: userId,
    slug: randomToken(),
    snapshot: payload,
    public_index: publicIndex,
    revoked_at: null,
  };
  await db
    .prepare('INSERT INTO shares (id, user_id, slug, snapshot, public_index, revoked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)')
    .bind(created.id, created.user_id, created.slug, created.snapshot, created.public_index, now, now)
    .run();
  if (displayName) {
    await db.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(displayName, userId).run();
  }
  return { ok: true, share: await present(db, created) };
}

function scoreInputs(products: StoredProduct[]): ScoreProduct[] {
  return products.map((product) => ({
    id: product.id,
    servingsPerDay: product.servingsPerDay,
    ingredients: product.ingredients.map((ingredient) => ({
      key: ingredient.key,
      amount: ingredient.amount,
      unit: ingredient.unit,
    })),
  }));
}

export async function currentShare(db: D1Database, userId: string): Promise<ShareView | null> {
  const row = await activeShare(db, userId);
  if (!row) return null;
  return present(db, row);
}

export async function revokeShare(db: D1Database, userId: string): Promise<boolean> {
  const row = await activeShare(db, userId);
  if (!row) return false;
  await db.prepare('UPDATE shares SET revoked_at = ?, updated_at = ? WHERE id = ?').bind(new Date().toISOString(), new Date().toISOString(), row.id).run();
  return true;
}

export async function publicShare(db: D1Database, slug: string): Promise<{ status: number; view: ShareView | null; html: string }> {
  if (!isSlug(slug)) return { status: 404, view: null, html: renderSharePage(null) };
  const row = await db
    .prepare('SELECT id, user_id, slug, snapshot, public_index, revoked_at FROM shares WHERE slug = ?')
    .bind(slug)
    .first<ShareRow>();
  if (!row || row.revoked_at) return { status: 404, view: null, html: renderSharePage(null) };
  const view = await present(db, row);
  return { status: 200, view, html: renderSharePage(view) };
}

export async function copyShare(
  db: D1Database,
  slug: string,
  userId: string,
): Promise<{ ok: true; alreadyCopied: boolean; products: StoredProduct[]; credit: string } | { ok: false; error: string; status: number }> {
  const row = await liveRow(db, slug);
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (row.user_id === userId) return { ok: false, error: 'You already have this stack.', status: 400 };
  const snapshot = parseSnapshot(row.snapshot);
  if (!snapshot) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  const existing = await db
    .prepare('SELECT user_id FROM share_copies WHERE share_id = ? AND user_id = ?')
    .bind(row.id, userId)
    .first<{ user_id: string }>();
  if (!existing) {
    await db.prepare('INSERT INTO share_copies (share_id, user_id, copied_at) VALUES (?, ?, ?)').bind(row.id, userId, new Date().toISOString()).run();
  }
  const credit = snapshot.displayName ? `Copied from ${snapshot.displayName}.` : 'Copied from a Stack user.';
  return { ok: true, alreadyCopied: Boolean(existing), products: snapshot.products, credit };
}

export async function submitOutcome(
  db: D1Database,
  slug: string,
  userId: string,
  input: { metric?: unknown; samples?: unknown; stackStart?: unknown; device?: unknown; asOf?: unknown },
): Promise<{ ok: true; result: PersonalResult | null; aggregate: AggregateResult | null } | { ok: false; error: string; status: number }> {
  const row = await liveRow(db, slug);
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (row.user_id === userId) return { ok: false, error: 'Your own result stays on the share you published.', status: 400 };
  const copied = await db.prepare('SELECT user_id FROM share_copies WHERE share_id = ? AND user_id = ?').bind(row.id, userId).first();
  if (!copied) return { ok: false, error: 'Copy the stack before adding a result.', status: 400 };
  if (!isOutcomeMetric(input.metric) || typeof input.stackStart !== 'string') {
    return { ok: false, error: 'That personal result could not be read.', status: 400 };
  }
  const samples = parseSamples(input.samples);
  if (!samples) return { ok: false, error: 'That personal result could not be read.', status: 400 };
  const computed = personalOutcome({
    metric: input.metric,
    samples,
    stackStart: input.stackStart,
    device: typeof input.device === 'string' ? input.device : 'Apple Health',
    asOf: typeof input.asOf === 'string' ? input.asOf : todayIso(),
  });
  if (!computed.eligible) return { ok: true, result: null, aggregate: await aggregateFor(db, row, null) };
  const profile = await readProfile(db, userId);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO share_outcomes (share_id, user_id, metric, percent_change, window_days, device, age_range, sex, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(share_id, user_id) DO UPDATE SET
         metric = excluded.metric,
         percent_change = excluded.percent_change,
         window_days = excluded.window_days,
         device = excluded.device,
         age_range = excluded.age_range,
         sex = excluded.sex,
         updated_at = excluded.updated_at`,
    )
    .bind(
      row.id,
      userId,
      computed.metric,
      computed.percent,
      computed.windowDays,
      computed.device,
      profile?.age_range && isAgeRange(profile.age_range) ? profile.age_range : 'unspecified',
      profile?.sex && isSex(profile.sex) ? profile.sex : 'unspecified',
      now,
    )
    .run();
  return { ok: true, result: computed, aggregate: await aggregateFor(db, row, null) };
}

export async function aggregateForShare(
  db: D1Database,
  slug: string,
  filter: { ageRange?: string | null; sex?: string | null },
): Promise<AggregateResult | null> {
  const row = await liveRow(db, slug);
  if (!row) return null;
  return aggregateFor(db, row, filter);
}

async function aggregateFor(db: D1Database, row: ShareRow, filter: { ageRange?: string | null; sex?: string | null } | null): Promise<AggregateResult | null> {
  const listed = await db
    .prepare('SELECT metric, percent_change, window_days, age_range, sex FROM share_outcomes WHERE share_id = ? AND user_id != ?')
    .bind(row.id, row.user_id)
    .all<OutcomeRow & { percent_change: number; window_days: number; age_range: string; sex: string; metric: string }>();
  const rows: OutcomeRow[] = [];
  for (const item of listed.results ?? []) {
    if (!isOutcomeMetric(item.metric)) continue;
    rows.push({
      metric: item.metric,
      percentChange: item.percent_change,
      windowDays: item.window_days,
      ageRange: item.age_range,
      sex: item.sex,
    });
  }
  return aggregateOutcomes(rows, filter ?? undefined);
}

function computeResult(raw: unknown, asOf: string): PersonalResult | { eligible: false; reason: string } | null | 'invalid' {
  if (raw == null) return null;
  if (!raw || typeof raw !== 'object') return 'invalid';
  const body = raw as Record<string, unknown>;
  if (!isOutcomeMetric(body.metric) || typeof body.stackStart !== 'string') return 'invalid';
  const samples = parseSamples(body.samples);
  if (!samples) return 'invalid';
  return personalOutcome({
    metric: body.metric,
    samples,
    stackStart: body.stackStart,
    device: typeof body.device === 'string' ? body.device : 'Apple Health',
    asOf: typeof body.asOf === 'string' ? body.asOf : asOf,
  });
}

function parseSamples(value: unknown): DayValue[] | null {
  if (!Array.isArray(value) || value.length > 800) return null;
  const samples: DayValue[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.date !== 'string' || typeof row.value !== 'number') return null;
    samples.push({ date: row.date, value: row.value });
  }
  return samples;
}

function parseProducts(value: unknown): StoredProduct[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const products: StoredProduct[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const name = cleanName(raw.name);
    if (!name) return null;
    const servingsPerDay = typeof raw.servingsPerDay === 'number' ? raw.servingsPerDay : Number.NaN;
    if (!Number.isFinite(servingsPerDay) || servingsPerDay <= 0 || servingsPerDay > 20) return null;
    const container = typeof raw.servingsPerContainer === 'number' ? Math.round(raw.servingsPerContainer) : 30;
    const servingsPerContainer = container > 0 && container <= 1000 ? container : 30;
    if (!Array.isArray(raw.ingredients) || raw.ingredients.length > 40) return null;
    const ingredients: StoredIngredient[] = [];
    for (const entry of raw.ingredients) {
      if (!entry || typeof entry !== 'object') return null;
      const ingredient = entry as Record<string, unknown>;
      const ingredientName = cleanName(ingredient.name);
      const key = typeof ingredient.key === 'string' && ingredient.key.trim() ? ingredient.key.trim().slice(0, 80) : ingredientName;
      const amount = typeof ingredient.amount === 'number' ? ingredient.amount : Number.NaN;
      const unit = typeof ingredient.unit === 'string' ? ingredient.unit.trim().slice(0, 20) : '';
      if (!ingredientName || !key || !unit || !Number.isFinite(amount) || amount <= 0) continue;
      ingredients.push({ key, name: ingredientName, amount, unit });
    }
    products.push({
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : randomId(),
      name,
      brand: cleanName(raw.brand) ?? '',
      servingsPerContainer,
      servingsPerDay,
      ingredients,
    });
  }
  return products.length > 0 ? products : null;
}

function parseSnapshot(payload: string): ShareSnapshot | null {
  try {
    const parsed = JSON.parse(payload) as ShareSnapshot;
    if (!parsed || !Array.isArray(parsed.products) || typeof parsed.auditScore !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function present(db: D1Database, row: ShareRow): Promise<ShareView> {
  const snapshot = parseSnapshot(row.snapshot);
  const copyCount = await db
    .prepare('SELECT COUNT(*) AS n FROM share_copies WHERE share_id = ? AND user_id != ?')
    .bind(row.id, row.user_id)
    .first<{ n: number }>();
  const aggregate = await aggregateFor(db, row, null);
  return {
    slug: row.slug,
    displayName: snapshot?.displayName ?? null,
    products: (snapshot?.products ?? []).map((product) => ({
      name: product.name,
      brand: product.brand,
      servingsPerDay: product.servingsPerDay,
      ingredients: product.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
      })),
    })),
    auditScore: snapshot?.auditScore ?? 0,
    result: snapshot?.result ?? null,
    copyCount: copyCount?.n ?? 0,
    aggregate,
    publicIndex: row.public_index === 1,
  };
}

async function activeShare(db: D1Database, userId: string): Promise<ShareRow | null> {
  return db
    .prepare('SELECT id, user_id, slug, snapshot, public_index, revoked_at FROM shares WHERE user_id = ? AND revoked_at IS NULL ORDER BY updated_at DESC LIMIT 1')
    .bind(userId)
    .first<ShareRow>();
}

async function liveRow(db: D1Database, slug: string): Promise<ShareRow | null> {
  if (!isSlug(slug)) return null;
  const row = await db
    .prepare('SELECT id, user_id, slug, snapshot, public_index, revoked_at FROM shares WHERE slug = ?')
    .bind(slug)
    .first<ShareRow>();
  if (!row || row.revoked_at) return null;
  return row;
}

function isSlug(value: string): boolean {
  return /^[a-f0-9]{32,64}$/.test(value);
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 80);
  return trimmed || null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function previewPersonal(input: {
  metric?: unknown;
  samples?: unknown;
  stackStart?: unknown;
  device?: unknown;
  asOf?: unknown;
}): PersonalResult | { eligible: false; reason: string } | null {
  if (!isOutcomeMetric(input.metric) || typeof input.stackStart !== 'string') return null;
  const samples = parseSamples(input.samples);
  if (!samples) return null;
  return personalOutcome({
    metric: input.metric,
    samples,
    stackStart: input.stackStart,
    device: typeof input.device === 'string' ? input.device : 'Apple Health',
    asOf: typeof input.asOf === 'string' ? input.asOf : todayIso(),
  });
}
