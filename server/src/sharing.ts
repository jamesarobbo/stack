import { scoreStack, type ScoreProduct, type ScoreResult } from '../../shared/auditScore';
import {
  OUTCOME_LABELS,
  PERSONAL_DISCLAIMER,
  PERSONAL_FRAMING,
  READY_AFTER_DAYS,
  discoverOutcomeLine,
  outcomeLine,
  validateOutcomeFields,
  type OutcomeFields,
  type OutcomeMetric,
} from '../../shared/outcome';
import { cohortKeyFor, cohortsForShare, type CohortReport } from './cohorts';
import { randomId, randomToken } from './crypto';
import {
  defaultStackName,
  dropFromLibrary,
  indexShare,
  ingredientSearchText,
  isAgeRange,
  isSex,
  parseLibraryGoals,
  refreshShareCopyCount,
  shownCopies,
  type LibraryGoal,
  type ShareCard,
} from './library';
import { hasDiseaseWord, nameProblem, problemMessage, productNameProblem } from './moderation';

export { isAgeRange, isSex };

export type StoredIngredient = { key: string; name: string; amount: number; unit: string; family?: string; familyLabel?: string };
export type StoredProduct = {
  id: string;
  name: string;
  brand: string;
  servingsPerContainer: number;
  servingsPerDay: number;
  source: 'off' | null;
  ingredients: StoredIngredient[];
};

export type SharedResult = OutcomeFields & {
  label: string;
  line: string;
  disclaimer: typeof PERSONAL_DISCLAIMER;
  framing: typeof PERSONAL_FRAMING;
};

export type ShareSnapshot = {
  displayName: string | null;
  stackName: string;
  goals: LibraryGoal[];
  products: StoredProduct[];
  auditScore: number;
  result: SharedResult | null;
};

export type ShareView = {
  slug: string;
  displayName: string | null;
  stackName: string;
  goals: string[];
  products: StoredProduct[];
  auditScore: number;
  score: Pick<ScoreResult, 'score' | 'summary' | 'reasons' | 'totals'>;
  result: SharedResult | null;
  copyCount: number | null;
  listed: boolean;
  version: number;
  createdOn: string;
  updatedOn: string | null;
  changes: string[];
  openFoodFacts: boolean;
};

type ShareRow = {
  id: string;
  user_id: string;
  slug: string;
  snapshot: string;
  listed: number;
  revoked_at: string | null;
  hidden_at: string | null;
  version: number;
  material_version: number;
  kept_count: number;
  created_at: string;
  updated_at: string;
};

const SHARE_COLUMNS =
  'id, user_id, slug, snapshot, listed, revoked_at, hidden_at, version, material_version, kept_count, created_at, updated_at';

export async function saveProfile(
  db: D1Database,
  userId: string,
  input: { ageRange?: unknown; sex?: unknown; displayName?: unknown },
): Promise<{ ok: true; profile: { ageRange: string | null; sex: string | null; displayName: string | null } } | { ok: false; error: string }> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (isAgeRange(input.ageRange)) {
    sets.push('age_range = ?');
    params.push(input.ageRange);
  }
  if (isSex(input.sex)) {
    sets.push('sex = ?');
    params.push(input.sex);
  }
  if (input.displayName === null || input.displayName === '') {
    sets.push('display_name = NULL');
  } else if (typeof input.displayName === 'string') {
    const name = cleanName(input.displayName);
    const problem = name ? nameProblem(name) : null;
    if (problem) return { ok: false, error: problemMessage(problem, 'name') };
    sets.push('display_name = ?');
    params.push(name);
  }
  if (sets.length > 0) {
    await db
      .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...params, userId)
      .run();
  }
  const row = await readProfile(db, userId);
  return { ok: true, profile: { ageRange: row?.age_range ?? null, sex: row?.sex ?? null, displayName: row?.display_name ?? null } };
}

export async function readProfile(db: D1Database, userId: string) {
  return db
    .prepare('SELECT age_range, sex, display_name, created_at FROM users WHERE id = ?')
    .bind(userId)
    .first<{ age_range: string | null; sex: string | null; display_name: string | null; created_at: string }>();
}

export async function upsertShare(
  db: D1Database,
  userId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; share: ShareView } | { ok: false; error: string }> {
  const parsed = parseProducts(input.products);
  if ('error' in parsed) return { ok: false, error: parsed.error };
  const products = parsed.products;
  const displayName = cleanName(input.displayName);
  if (displayName) {
    const problem = nameProblem(displayName);
    if (problem) return { ok: false, error: problemMessage(problem, 'name') };
  }
  const named = cleanName(input.stackName);
  if (named) {
    const problem = nameProblem(named);
    if (problem) return { ok: false, error: problemMessage(problem, 'stack name') };
  }
  const goals = parseLibraryGoals(input.goals);
  const stackName = named ?? defaultStackName(displayName, products[0]?.name ?? null);
  const scored = scoreStack(scoreInputs(products));
  const existing = await activeShare(db, userId);
  const previous = existing ? parseSnapshot(existing.snapshot) : null;

  let result: SharedResult | null = null;
  if (input.result === 'keep') {
    result = previous?.result ?? null;
  } else if (input.result != null) {
    const fields = validateOutcomeFields(input.result);
    if (!fields) return { ok: false, error: 'That personal result could not be read.' };
    result = presentResult(fields);
  }

  const snapshot: ShareSnapshot = { displayName, stackName, goals, products, auditScore: scored.score, result };
  const payload = JSON.stringify(snapshot);
  if (payload.length > 80_000) return { ok: false, error: 'That stack is too large to share.' };
  const listed = input.listed === true || input.publicIndex === true;
  const discoverOk = !scored.overTwiceLimit && !products.some((product) => hasDiseaseWord(product.name));
  const card = cardFor(products, scored, result);
  const now = new Date().toISOString();

  if (existing && previous) {
    const changes = describeChanges(previous, snapshot);
    const material = materialKey(previous.products) !== materialKey(products);
    if (material && changes.length === 0) changes.push('Doses changed');
    const version = changes.length > 0 ? existing.version + 1 : existing.version;
    const materialVersion = material ? version : existing.material_version;
    const statements = [
      db
        .prepare('UPDATE shares SET snapshot = ?, version = ?, material_version = ?, updated_at = ? WHERE id = ?')
        .bind(payload, version, materialVersion, changes.length > 0 ? now : existing.updated_at, existing.id),
    ];
    if (changes.length > 0) {
      statements.push(
        db
          .prepare('INSERT INTO share_versions (share_id, version, material_version, snapshot, changes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(existing.id, version, materialVersion, payload, JSON.stringify(changes), now),
      );
    }
    await db.batch(statements);
    await indexShare(db, {
      id: existing.id,
      listed,
      discoverOk,
      stackName,
      creatorName: displayName ?? '',
      goals,
      ingredients: ingredientSearchText(products),
      auditScore: scored.score,
      card,
    });
    const row = await rowById(db, existing.id);
    return { ok: true, share: await present(db, row ?? existing) };
  }

  const id = randomId();
  await db.batch([
    db
      .prepare(
        `INSERT INTO shares (id, user_id, slug, snapshot, listed, revoked_at, created_at, updated_at, version, material_version)
         VALUES (?, ?, ?, ?, 0, NULL, ?, ?, 1, 1)`,
      )
      .bind(id, userId, randomToken(), payload, now, now),
    db
      .prepare('INSERT INTO share_versions (share_id, version, material_version, snapshot, changes, created_at) VALUES (?, 1, 1, ?, ?, ?)')
      .bind(id, payload, '[]', now),
  ]);
  await indexShare(db, {
    id,
    listed,
    discoverOk,
    stackName,
    creatorName: displayName ?? '',
    goals,
    ingredients: ingredientSearchText(products),
    auditScore: scored.score,
    card,
  });
  const row = await rowById(db, id);
  if (!row) return { ok: false, error: 'The link could not be created.' };
  return { ok: true, share: await present(db, row) };
}

function presentResult(fields: OutcomeFields): SharedResult {
  return {
    ...fields,
    label: OUTCOME_LABELS[fields.metric],
    line: outcomeLine(fields),
    disclaimer: PERSONAL_DISCLAIMER,
    framing: PERSONAL_FRAMING,
  };
}

function cardFor(products: StoredProduct[], scored: ScoreResult, result: OutcomeFields | null): ShareCard {
  return {
    productCount: products.length,
    summary: scored.summary,
    composition: scored.totals.slice(0, 8).map((total) => ({
      name: total.name,
      ofLimit: total.ofLimit == null ? null : Math.round(total.ofLimit * 100) / 100,
    })),
    productNames: products.map((product) => product.name.trim()).filter(Boolean).slice(0, 12),
    outcomeLine: result ? discoverOutcomeLine(result) : null,
  };
}

/** Ingredients and daily doses. A change here starts a new copy count and a new copier average. */
export function materialKey(products: StoredProduct[]): string {
  const rows = products
    .map((product) =>
      product.ingredients
        .map((ingredient) => `${ingredient.key}:${roundDose(ingredient.amount * product.servingsPerDay)}:${ingredient.unit.toLowerCase()}`)
        .sort()
        .join(','),
    )
    .sort();
  return rows.join('|');
}

function roundDose(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function describeChanges(before: ShareSnapshot, after: ShareSnapshot): string[] {
  const changes: string[] = [];
  const byName = (list: StoredProduct[]) => new Map(list.map((product) => [productKey(product), product]));
  const old = byName(before.products);
  const next = byName(after.products);
  for (const [key, product] of next) {
    const was = old.get(key);
    if (!was) {
      changes.push(`Added ${product.name}`);
      continue;
    }
    if (was.servingsPerDay !== product.servingsPerDay) {
      changes.push(`${product.name}: ${formatCount(product.servingsPerDay)} a day, was ${formatCount(was.servingsPerDay)}`);
    }
    for (const ingredient of product.ingredients) {
      const prior = was.ingredients.find((item) => item.key === ingredient.key);
      if (!prior) changes.push(`${product.name}: added ${ingredient.name}`);
      else if (prior.amount !== ingredient.amount || prior.unit !== ingredient.unit) {
        changes.push(`${ingredient.name} ${formatCount(ingredient.amount)} ${ingredient.unit}, was ${formatCount(prior.amount)} ${prior.unit}`);
      }
    }
    for (const prior of was.ingredients) {
      if (!product.ingredients.some((item) => item.key === prior.key)) changes.push(`${product.name}: removed ${prior.name}`);
    }
  }
  for (const [key, product] of old) {
    if (!next.has(key)) changes.push(`Removed ${product.name}`);
  }
  if (before.stackName !== after.stackName) changes.push(`Renamed to ${after.stackName}`);
  if (before.goals.join(' ') !== after.goals.join(' ')) changes.push('Goals changed');
  if (JSON.stringify(before.result) !== JSON.stringify(after.result)) {
    changes.push(after.result ? 'Personal result updated' : 'Personal result removed');
  }
  if (before.displayName !== after.displayName) changes.push(after.displayName ? 'Name shown changed' : 'Name hidden');
  return changes.slice(0, 12);
}

function productKey(product: StoredProduct): string {
  return `${product.name.trim().toLowerCase()}|${product.brand.trim().toLowerCase()}`;
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function scoreInputs(products: StoredProduct[]): ScoreProduct[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    servingsPerDay: product.servingsPerDay,
    ingredients: product.ingredients.map((ingredient) => ({
      key: ingredient.key,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      family: ingredient.family,
      familyLabel: ingredient.familyLabel,
    })),
  }));
}

export async function currentShare(db: D1Database, userId: string): Promise<(ShareView & { hidden: boolean }) | null> {
  const row = await activeShare(db, userId);
  if (!row) return null;
  return { ...(await present(db, row)), hidden: Boolean(row.hidden_at) };
}

export async function revokeShare(db: D1Database, userId: string): Promise<boolean> {
  const row = await activeShare(db, userId);
  if (!row) return false;
  const now = new Date().toISOString();
  await db.prepare('UPDATE shares SET revoked_at = ?, updated_at = ? WHERE id = ?').bind(now, now, row.id).run();
  await dropFromLibrary(db, row.id);
  return true;
}

export type ViewerState = { saved: boolean; blocked: boolean; copied: { copiedOn: string; current: boolean; outcomeConsent: boolean } | null; own: boolean };

export async function publicShare(db: D1Database, slug: string): Promise<{ view: ShareView; row: ShareRow } | null> {
  const row = await liveRow(db, slug);
  if (!row) return null;
  return { view: await present(db, row), row };
}

export async function viewerState(db: D1Database, row: { id: string; user_id: string; material_version: number }, viewerId: string): Promise<ViewerState> {
  const [saved, blocked, copied] = await db.batch([
    db.prepare('SELECT 1 AS hit FROM share_saves WHERE share_id = ? AND user_id = ?').bind(row.id, viewerId),
    db.prepare('SELECT 1 AS hit FROM user_blocks WHERE user_id = ? AND blocked_user_id = ?').bind(viewerId, row.user_id),
    db
      .prepare('SELECT copied_at, material_version, outcome_consent FROM share_copies WHERE share_id = ? AND user_id = ?')
      .bind(row.id, viewerId),
  ]);
  const copy = (copied?.results?.[0] ?? null) as { copied_at: string; material_version: number; outcome_consent: number } | null;
  return {
    saved: (saved?.results?.length ?? 0) > 0,
    blocked: (blocked?.results?.length ?? 0) > 0,
    copied: copy
      ? { copiedOn: copy.copied_at.slice(0, 10), current: copy.material_version === row.material_version, outcomeConsent: copy.outcome_consent === 1 }
      : null,
    own: row.user_id === viewerId,
  };
}

/** Records a copy after the app has written the products. Copying again restarts the copy at the current version. */
export async function recordCopy(
  db: D1Database,
  slug: string,
  userId: string,
  input: { outcomeConsent?: unknown },
): Promise<{ ok: true; copiedOn: string; restarted: boolean } | { ok: false; error: string; status: number }> {
  const row = await liveRow(db, slug);
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (row.user_id === userId) return { ok: false, error: 'This is your stack.', status: 400 };
  const profile = await readProfile(db, userId);
  const ageDays = profile?.created_at ? Math.floor((Date.now() - Date.parse(profile.created_at)) / 86_400_000) : 0;
  const consent = input.outcomeConsent === true ? 1 : 0;
  const now = new Date().toISOString();
  const existing = await db
    .prepare('SELECT copied_at, material_version, in_stack FROM share_copies WHERE share_id = ? AND user_id = ?')
    .bind(row.id, userId)
    .first<{ copied_at: string; material_version: number; in_stack: number }>();
  if (existing && existing.in_stack === 1 && existing.material_version === row.material_version) {
    await db.prepare('UPDATE share_copies SET outcome_consent = ? WHERE share_id = ? AND user_id = ?').bind(consent, row.id, userId).run();
    return { ok: true, copiedOn: existing.copied_at.slice(0, 10), restarted: false };
  }
  await db
    .prepare(
      `INSERT INTO share_copies (share_id, user_id, copied_at, version, material_version, in_stack, checked_at, account_age_days, outcome_consent)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
       ON CONFLICT(share_id, user_id) DO UPDATE SET
         copied_at = excluded.copied_at, version = excluded.version, material_version = excluded.material_version,
         in_stack = 1, checked_at = excluded.checked_at, account_age_days = excluded.account_age_days,
         outcome_consent = excluded.outcome_consent`,
    )
    .bind(row.id, userId, now, row.version, row.material_version, now, ageDays, consent)
    .run();
  await db.prepare('DELETE FROM copier_outcomes WHERE share_id = ? AND user_id = ?').bind(row.id, userId).run();
  await refreshShareCopyCount(db, row.id);
  return { ok: true, copiedOn: now.slice(0, 10), restarted: Boolean(existing) };
}

export async function setOutcomeConsent(db: D1Database, slug: string, userId: string, consent: boolean): Promise<boolean> {
  const row = await liveRow(db, slug, { includeHidden: !consent });
  if (!row) return false;
  await db.prepare('UPDATE share_copies SET outcome_consent = ? WHERE share_id = ? AND user_id = ?').bind(consent ? 1 : 0, row.id, userId).run();
  if (!consent) await db.prepare('DELETE FROM copier_outcomes WHERE share_id = ? AND user_id = ?').bind(row.id, userId).run();
  return true;
}

/** Keeps share_copies.in_stack in step with the copier's synced stack. Copied products carry catalogueId share:<slug>. */
export async function syncCopiesFromStack(db: D1Database, userId: string, catalogueIds: (string | null | undefined)[]): Promise<void> {
  const slugs = [...new Set(catalogueIds.filter((id): id is string => typeof id === 'string' && id.startsWith('share:')).map((id) => id.slice(6).split(':')[0] ?? ''))].filter(Boolean);
  await db
    .prepare(
      `UPDATE share_copies SET
         in_stack = CASE WHEN share_id IN (SELECT s.id FROM shares s, json_each(?) j WHERE s.slug = j.value) THEN 1 ELSE 0 END,
         checked_at = ?
       WHERE user_id = ?`,
    )
    .bind(JSON.stringify(slugs), new Date().toISOString(), userId)
    .run();
}

export async function listCopies(db: D1Database, userId: string) {
  const rows = await db
    .prepare(
      `SELECT s.slug, s.stack_name, c.copied_at, c.outcome_consent, c.material_version,
              (SELECT COUNT(*) FROM copier_outcomes o WHERE o.share_id = c.share_id AND o.user_id = c.user_id) AS results
       FROM share_copies c JOIN shares s ON s.id = c.share_id
       WHERE c.user_id = ? AND s.revoked_at IS NULL
       ORDER BY c.copied_at DESC LIMIT 50`,
    )
    .bind(userId)
    .all<{ slug: string; stack_name: string; copied_at: string; outcome_consent: number; material_version: number; results: number }>();
  return (rows.results ?? []).map((row) => ({
    slug: row.slug,
    stackName: row.stack_name,
    copiedOn: row.copied_at.slice(0, 10),
    outcomeConsent: row.outcome_consent === 1,
    resultsSent: row.results > 0,
    readyOn: addDaysIso(row.copied_at.slice(0, 10), READY_AFTER_DAYS - 1),
  }));
}

/**
 * Copier results. The window is fixed by the copy date on the server. The phone sends only derived fields,
 * which are validated here, and only after the person agreed when copying.
 */
export async function submitOutcome(
  db: D1Database,
  slug: string,
  userId: string,
  input: { results?: unknown },
  today = new Date().toISOString().slice(0, 10),
): Promise<{ ok: true; saved: number } | { ok: false; error: string; status: number }> {
  const row = await liveRow(db, slug);
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (row.user_id === userId) return { ok: false, error: 'Your own result stays on the share you published.', status: 400 };
  const copy = await db
    .prepare('SELECT copied_at, material_version, outcome_consent FROM share_copies WHERE share_id = ? AND user_id = ?')
    .bind(row.id, userId)
    .first<{ copied_at: string; material_version: number; outcome_consent: number }>();
  if (!copy) return { ok: false, error: 'Copy the stack before adding a result.', status: 400 };
  if (copy.outcome_consent !== 1) return { ok: false, error: 'Turn on result sharing for this stack first.', status: 403 };
  const readyOn = addDaysIso(copy.copied_at.slice(0, 10), READY_AFTER_DAYS - 1);
  if (today < readyOn) return { ok: false, error: `Results open on ${readyOn}.`, status: 400 };
  if (!Array.isArray(input.results) || input.results.length === 0 || input.results.length > 3) {
    return { ok: false, error: 'That result could not be read.', status: 400 };
  }
  const fields: OutcomeFields[] = [];
  const seen = new Set<OutcomeMetric>();
  for (const raw of input.results) {
    const valid = validateOutcomeFields(raw);
    if (!valid || seen.has(valid.metric)) return { ok: false, error: 'That result could not be read.', status: 400 };
    seen.add(valid.metric);
    fields.push(valid);
  }
  const profile = await readProfile(db, userId);
  const ageRange = profile?.age_range && isAgeRange(profile.age_range) ? profile.age_range : 'unspecified';
  const sex = profile?.sex && isSex(profile.sex) ? profile.sex : 'unspecified';
  const now = new Date().toISOString();
  await db.batch(
    fields.map((item) =>
      db
        .prepare(
          `INSERT INTO copier_outcomes (share_id, user_id, material_version, metric, percent_change, within_normal, window_days, device, age_range, sex, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(share_id, user_id, metric) DO UPDATE SET
             material_version = excluded.material_version, percent_change = excluded.percent_change,
             within_normal = excluded.within_normal, window_days = excluded.window_days, device = excluded.device,
             age_range = excluded.age_range, sex = excluded.sex, submitted_at = excluded.submitted_at`,
        )
        .bind(row.id, userId, copy.material_version, item.metric, item.percent, item.withinNormal ? 1 : 0, item.windowDays, item.device, ageRange, sex, now),
    ),
  );
  return { ok: true, saved: fields.length };
}

/** In-app only. Requires a signed-in viewer. */
export async function cohortReport(
  db: D1Database,
  slug: string,
  viewer: { ageRange: string | null; sex: string | null },
): Promise<(CohortReport & { viewerCohort: string | null }) | null> {
  const row = await liveRow(db, slug);
  if (!row) return null;
  const report = await cohortsForShare(db, { id: row.id, userId: row.user_id, materialVersion: row.material_version });
  return { ...report, viewerCohort: cohortKeyFor(viewer.ageRange, viewer.sex) };
}

type ParsedProducts = { products: StoredProduct[] } | { error: string };

function parseProducts(value: unknown): ParsedProducts {
  const fail = { error: 'Add at least one product before sharing.' };
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return fail;
  const products: StoredProduct[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return fail;
    const raw = item as Record<string, unknown>;
    const name = cleanName(raw.name);
    if (!name) return fail;
    const problem = productNameProblem(name) ?? productNameProblem(cleanName(raw.brand) ?? '');
    if (problem) return { error: problemMessage(problem, 'product name') };
    const servingsPerDay = typeof raw.servingsPerDay === 'number' ? raw.servingsPerDay : Number.NaN;
    if (!Number.isFinite(servingsPerDay) || servingsPerDay <= 0 || servingsPerDay > 20) return fail;
    const container = typeof raw.servingsPerContainer === 'number' ? Math.round(raw.servingsPerContainer) : 30;
    const servingsPerContainer = container > 0 && container <= 1000 ? container : 30;
    if (!Array.isArray(raw.ingredients) || raw.ingredients.length > 40) return fail;
    const ingredients: StoredIngredient[] = [];
    for (const entry of raw.ingredients) {
      if (!entry || typeof entry !== 'object') return fail;
      const ingredient = entry as Record<string, unknown>;
      const ingredientName = cleanName(ingredient.name);
      const key = typeof ingredient.key === 'string' && ingredient.key.trim() ? ingredient.key.trim().slice(0, 80) : ingredientName;
      const amount = typeof ingredient.amount === 'number' ? ingredient.amount : Number.NaN;
      const unit = typeof ingredient.unit === 'string' ? ingredient.unit.trim().slice(0, 20) : '';
      if (!ingredientName || !key || !unit || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) continue;
      const family = typeof ingredient.family === 'string' && ingredient.family.trim() ? ingredient.family.trim().slice(0, 80) : undefined;
      const familyLabel = cleanName(ingredient.familyLabel) ?? undefined;
      ingredients.push({ key, name: ingredientName, amount, unit, ...(family ? { family } : {}), ...(familyLabel ? { familyLabel } : {}) });
    }
    products.push({
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : randomId(),
      name,
      brand: cleanName(raw.brand) ?? '',
      servingsPerContainer,
      servingsPerDay,
      source: raw.source === 'off' ? 'off' : null,
      ingredients,
    });
  }
  return { products };
}

function parseSnapshot(payload: string): ShareSnapshot | null {
  try {
    const parsed = JSON.parse(payload) as ShareSnapshot;
    if (!parsed || !Array.isArray(parsed.products) || typeof parsed.auditScore !== 'number') return null;
    return {
      ...parsed,
      goals: parseLibraryGoals(parsed.goals),
      products: parsed.products.map((product) => ({ ...product, source: product.source === 'off' ? 'off' : null })),
      result: parsed.result && typeof parsed.result === 'object' && 'withinNormal' in parsed.result ? parsed.result : null,
    };
  } catch {
    return null;
  }
}

async function present(db: D1Database, row: ShareRow): Promise<ShareView> {
  const snapshot = parseSnapshot(row.snapshot);
  const products = snapshot?.products ?? [];
  const scored = scoreStack(scoreInputs(products));
  let changes: string[] = [];
  if (row.version > 1) {
    const latest = await db
      .prepare('SELECT changes FROM share_versions WHERE share_id = ? AND version = ?')
      .bind(row.id, row.version)
      .first<{ changes: string }>();
    try {
      const parsed = JSON.parse(latest?.changes ?? '[]') as unknown;
      changes = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      changes = [];
    }
  }
  return {
    slug: row.slug,
    displayName: snapshot?.displayName ?? null,
    stackName: snapshot?.stackName ?? 'Shared stack',
    goals: snapshot?.goals ?? [],
    products,
    auditScore: scored.score,
    score: { score: scored.score, summary: scored.summary, reasons: scored.reasons, totals: scored.totals },
    result: snapshot?.result ?? null,
    copyCount: shownCopies(row.kept_count),
    listed: row.listed === 1,
    version: row.version,
    createdOn: row.created_at.slice(0, 10),
    updatedOn: row.version > 1 ? row.updated_at.slice(0, 10) : null,
    changes,
    openFoodFacts: products.some((product) => product.source === 'off'),
  };
}

async function activeShare(db: D1Database, userId: string): Promise<ShareRow | null> {
  return db
    .prepare(`SELECT ${SHARE_COLUMNS} FROM shares WHERE user_id = ? AND revoked_at IS NULL ORDER BY updated_at DESC LIMIT 1`)
    .bind(userId)
    .first<ShareRow>();
}

async function rowById(db: D1Database, id: string): Promise<ShareRow | null> {
  return db.prepare(`SELECT ${SHARE_COLUMNS} FROM shares WHERE id = ?`).bind(id).first<ShareRow>();
}

/** A share that is not revoked. Shares hidden for review are left out unless includeHidden is set. */
export async function liveRow(db: D1Database, slug: string, options: { includeHidden?: boolean } = {}): Promise<ShareRow | null> {
  if (!isSlug(slug)) return null;
  const row = await db.prepare(`SELECT ${SHARE_COLUMNS} FROM shares WHERE slug = ?`).bind(slug).first<ShareRow>();
  if (!row || row.revoked_at) return null;
  if (row.hidden_at && !options.includeHidden) return null;
  return row;
}

export function isSlug(value: string): boolean {
  return /^[a-f0-9]{32,64}$/.test(value);
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, 80);
  return trimmed || null;
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
