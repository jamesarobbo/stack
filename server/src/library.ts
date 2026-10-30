import { cohortKeyFor, cohortsForShare, type CohortSlice } from './cohorts';
import { randomId } from './crypto';
import { AUTO_HIDE_REPORTS, isReportReason } from './moderation';

export const AGE_RANGES = ['18_29', '30_39', '40_49', '50_59', '60_plus', 'unspecified'] as const;
export const SEXES = ['female', 'male', 'unspecified'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];
export type Sex = (typeof SEXES)[number];

export function isAgeRange(value: unknown): value is AgeRange {
  return typeof value === 'string' && (AGE_RANGES as readonly string[]).includes(value);
}

export function isSex(value: unknown): value is Sex {
  return typeof value === 'string' && (SEXES as readonly string[]).includes(value);
}

export const LIBRARY_GOALS = ['sleep', 'energy', 'heart', 'recovery', 'focus', 'longevity'] as const;
export type LibraryGoal = (typeof LIBRARY_GOALS)[number];

export const GOAL_LABELS: Record<LibraryGoal, string> = {
  sleep: 'Sleep',
  energy: 'Energy',
  heart: 'Heart health',
  recovery: 'Recovery',
  focus: 'Focus',
  longevity: 'Longevity',
};

/** Copy counts below this are not shown. */
export const MIN_SHOWN_COPIES = 3;
/** A copy counts once the products have stayed in the copier's stack this long. */
export const KEPT_AFTER_DAYS = 7;
/** Top ranks by copies made in this many days that were then kept. */
export const TOP_WINDOW_DAYS = 30;

const PAGE_MAX = 50;
const DAY_MS = 86_400_000;

export type LibrarySegment = 'new' | 'top' | 'saved' | 'like_you';

export type CardComposition = { name: string; ofLimit: number | null };
export type ShareCard = { productCount: number; summary: string; composition: CardComposition[] };

export type LibraryItem = {
  slug: string;
  stackName: string;
  creatorName: string | null;
  goals: { key: LibraryGoal; label: string }[];
  auditScore: number;
  summary: string;
  productCount: number;
  composition: CardComposition[];
  copyCount: number | null;
  saved: boolean;
  updatedOn: string | null;
  likeYou: { label: string; line: string } | null;
};

export type LibraryPage = { items: LibraryItem[]; nextOffset: number | null; note: string | null };

export function parseLibraryGoals(value: unknown): LibraryGoal[] {
  if (!Array.isArray(value)) return [];
  const goals: LibraryGoal[] = [];
  for (const item of value) {
    if (typeof item === 'string' && (LIBRARY_GOALS as readonly string[]).includes(item) && !goals.includes(item as LibraryGoal)) {
      goals.push(item as LibraryGoal);
    }
    if (goals.length === 3) break;
  }
  return goals;
}

export function defaultStackName(displayName: string | null, productName: string | null): string {
  if (displayName) return `${displayName}'s stack`;
  if (productName) return productName;
  return 'Shared stack';
}

export function ingredientSearchText(products: { ingredients: { key: string; name: string }[] }[]): string {
  const parts = new Set<string>();
  for (const product of products) {
    for (const ingredient of product.ingredients) {
      const key = ingredient.key.trim().toLowerCase();
      const name = ingredient.name.trim().toLowerCase();
      if (key) parts.add(key);
      if (name) parts.add(name);
    }
  }
  return [...parts].join(' ');
}

/** FTS5 query. "has magnesium zinc" searches the ingredient column only, for every term. */
export function ftsMatch(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const has = /^has\s+(.+)$/.exec(trimmed);
  const source = has ? has[1] : trimmed;
  const tokens = (source ?? '').split(/[^a-z0-9]+/).filter((token) => token.length > 1).slice(0, 8);
  if (tokens.length === 0) return null;
  const terms = tokens.map((token) => `"${token}"*`).join(' AND ');
  return has ? `ingredients : (${terms})` : terms;
}

/** Whole number from a query string value, clamped. NaN and junk fall back to the default. */
export function intParam(value: string | undefined | null, fallback: number, min: number, max: number): number {
  if (value == null || !/^\d{1,6}$/.test(value.trim())) return fallback;
  return Math.min(max, Math.max(min, Number(value)));
}

/** Listing state and the search row. Saves are kept when a share leaves Discover. */
export async function indexShare(
  db: D1Database,
  input: {
    id: string;
    listed: boolean;
    discoverOk: boolean;
    stackName: string;
    creatorName: string;
    goals: LibraryGoal[];
    ingredients: string;
    auditScore: number;
    card: ShareCard;
  },
): Promise<void> {
  const goals = input.goals.join(' ');
  const statements = [
    db
      .prepare(
        `UPDATE shares
         SET listed = ?, discover_ok = ?, stack_name = ?, creator_name = ?, goals = ?, ingredients = ?, audit_score = ?, card = ?
         WHERE id = ?`,
      )
      .bind(
        input.listed ? 1 : 0,
        input.discoverOk ? 1 : 0,
        input.stackName,
        input.creatorName,
        goals,
        input.ingredients,
        input.auditScore,
        JSON.stringify(input.card),
        input.id,
      ),
    db.prepare('DELETE FROM share_search WHERE share_id = ?').bind(input.id),
  ];
  await db.batch(statements);
  await syncSearchRow(db, input.id);
}

/** The search row exists only while the share is listed, allowed in Discover, live, and not hidden for review. */
export async function syncSearchRow(db: D1Database, shareId: string): Promise<void> {
  const row = await db
    .prepare('SELECT listed, discover_ok, hidden_at, revoked_at, stack_name, creator_name, goals, ingredients FROM shares WHERE id = ?')
    .bind(shareId)
    .first<{
      listed: number;
      discover_ok: number;
      hidden_at: string | null;
      revoked_at: string | null;
      stack_name: string;
      creator_name: string;
      goals: string;
      ingredients: string;
    }>();
  const statements = [db.prepare('DELETE FROM share_search WHERE share_id = ?').bind(shareId)];
  if (row && row.listed === 1 && row.discover_ok === 1 && !row.hidden_at && !row.revoked_at) {
    statements.push(
      db
        .prepare('INSERT INTO share_search(share_id, stack_name, creator_name, goals, ingredients) VALUES (?, ?, ?, ?, ?)')
        .bind(shareId, row.stack_name, row.creator_name, row.goals, row.ingredients),
    );
  }
  await db.batch(statements);
}

export async function dropFromLibrary(db: D1Database, shareId: string): Promise<void> {
  await db.batch([
    db.prepare('UPDATE shares SET listed = 0 WHERE id = ?').bind(shareId),
    db.prepare('DELETE FROM share_search WHERE share_id = ?').bind(shareId),
  ]);
}

/**
 * Once per UTC day: kept copy counts for listed shares, plus housekeeping.
 * A kept copy is from an account at least a day old, of the current formulation,
 * at least 7 days old, with the copied products still in the copier's synced stack.
 */
export async function refreshDailyStats(db: D1Database, now = new Date(), force = false): Promise<boolean> {
  const day = now.toISOString().slice(0, 10);
  if (!force) {
    const meta = await db.prepare("SELECT value FROM app_meta WHERE key = 'stats_day'").bind().first<{ value: string }>();
    if (meta?.value === day) return false;
  }
  const keptBefore = new Date(now.getTime() - KEPT_AFTER_DAYS * DAY_MS).toISOString();
  const recentFrom = new Date(now.getTime() - (KEPT_AFTER_DAYS + TOP_WINDOW_DAYS) * DAY_MS).toISOString();
  const kept = `FROM share_copies c
    WHERE c.share_id = shares.id AND c.user_id != shares.user_id AND c.in_stack = 1
      AND c.account_age_days >= 1 AND c.material_version = shares.material_version AND c.copied_at <= ?`;
  await db.batch([
    db
      .prepare(
        `UPDATE shares SET
           kept_count = (SELECT COUNT(*) ${kept}),
           kept_recent = (SELECT COUNT(*) ${kept} AND c.copied_at >= ?)
         WHERE revoked_at IS NULL`,
      )
      .bind(keptBefore, keptBefore, recentFrom),
    db.prepare('DELETE FROM pending_links WHERE created_at < ?').bind(new Date(now.getTime() - 2 * 3_600_000).toISOString()),
    db.prepare('DELETE FROM off_cache WHERE fetched_at < ?').bind(new Date(now.getTime() - 30 * DAY_MS).toISOString()),
    db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(Math.floor(now.getTime() / 1000) - 2 * 86_400),
    db
      .prepare("INSERT INTO app_meta (key, value) VALUES ('stats_day', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(day),
  ]);
  return true;
}

export function shownCopies(count: number): number | null {
  return count >= MIN_SHOWN_COPIES ? count : null;
}

type ShareListRow = {
  id: string;
  slug: string;
  user_id: string;
  stack_name: string;
  creator_name: string;
  goals: string;
  audit_score: number;
  card: string;
  kept_count: number;
  version: number;
  material_version: number;
  updated_at: string;
  created_at: string;
  cohort_kept?: number;
};

export async function searchLibrary(
  db: D1Database,
  input: {
    segment: LibrarySegment;
    q?: string;
    goal?: string;
    limit: number;
    offset: number;
    viewer: { id: string; ageRange: string | null; sex: string | null } | null;
  },
): Promise<LibraryPage> {
  const limit = Math.min(PAGE_MAX, Math.max(1, Math.floor(input.limit)));
  const offset = Math.max(0, Math.floor(input.offset));
  const goal = (LIBRARY_GOALS as readonly string[]).includes(input.goal ?? '') ? input.goal : null;
  const match = input.q ? ftsMatch(input.q) : null;
  if (input.q && input.q.trim() && !match) return { items: [], nextOffset: null, note: 'No stacks match that search.' };
  if ((input.segment === 'saved' || input.segment === 'like_you') && !input.viewer) {
    return { items: [], nextOffset: null, note: input.segment === 'saved' ? 'Sign in to see saved stacks.' : 'Sign in to see stacks kept by people like you.' };
  }
  const cohort = input.viewer ? cohortKeyFor(input.viewer.ageRange, input.viewer.sex) : null;
  if (input.segment === 'like_you' && !cohort) {
    return { items: [], nextOffset: null, note: 'Add an age range and sex in Settings to see stacks kept by people like you.' };
  }

  const params: unknown[] = [];
  let select = `SELECT s.id, s.slug, s.user_id, s.stack_name, s.creator_name, s.goals, s.audit_score, s.card, s.kept_count,
    s.version, s.material_version, s.updated_at, s.created_at`;
  let from = 'shares s';
  let where = 's.listed = 1 AND s.discover_ok = 1 AND s.revoked_at IS NULL AND s.hidden_at IS NULL';
  if (input.segment === 'saved') {
    from = 'shares s JOIN share_saves v ON v.share_id = s.id';
    where += ' AND v.user_id = ?';
    params.push(input.viewer?.id);
  }
  if (input.viewer) {
    where += ' AND s.user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE user_id = ?)';
    params.push(input.viewer.id);
  }
  if (match) {
    where += ' AND s.id IN (SELECT share_id FROM share_search WHERE share_search MATCH ?)';
    params.push(match);
  }
  if (goal) {
    where += ` AND instr(' ' || s.goals || ' ', ' ' || ? || ' ') > 0`;
    params.push(goal);
  }

  let order = 's.created_at DESC';
  if (input.segment === 'top') order = 's.kept_recent DESC, s.kept_count DESC, s.created_at DESC';
  if (input.segment === 'saved') order = 'v.created_at DESC';
  const selectParams: unknown[] = [];
  if (input.segment === 'like_you' && input.viewer) {
    const [sex, ...group] = (cohort ?? '').split('_');
    const ages = ageRangesFor(group.join('_'));
    select += `, (SELECT COUNT(*) FROM share_copies c JOIN users u ON u.id = c.user_id
        WHERE c.share_id = s.id AND c.user_id != s.user_id AND c.in_stack = 1 AND c.account_age_days >= 1
          AND c.material_version = s.material_version AND c.copied_at <= ?
          AND u.sex = ? AND u.age_range IN (${ages.map(() => '?').join(', ')})) AS cohort_kept`;
    selectParams.push(new Date(Date.now() - KEPT_AFTER_DAYS * DAY_MS).toISOString(), sex, ...ages);
    where = `(${where})`;
    order = 'cohort_kept DESC, kept_count DESC, created_at DESC';
  }

  const having = input.segment === 'like_you' ? `WHERE cohort_kept >= ${MIN_SHOWN_COPIES}` : '';
  const query =
    input.segment === 'like_you'
      ? `SELECT * FROM (${select} FROM ${from} WHERE ${where}) ${having} ORDER BY ${order} LIMIT ? OFFSET ?`
      : `${select} FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`;
  const listed = await db
    .prepare(query)
    .bind(...selectParams, ...params, limit + 1, offset)
    .all<ShareListRow>();
  const rows = listed.results ?? [];
  const page = rows.slice(0, limit);
  const items = page.map(toItem);
  await attachSaved(db, items, page, input.viewer?.id ?? null);
  if (input.segment === 'like_you' && cohort) {
    for (let index = 0; index < page.length; index += 1) {
      const row = page[index];
      const item = items[index];
      if (!row || !item) continue;
      const report = await cohortsForShare(db, { id: row.id, userId: row.user_id, materialVersion: row.material_version });
      item.likeYou = likeYouLine(report.metrics, cohort);
    }
  }
  let note: string | null = null;
  if (items.length === 0 && offset === 0) {
    if (match || goal) note = 'No stacks match that search.';
    else if (input.segment === 'saved') note = 'Saved stacks show here.';
    else if (input.segment === 'like_you') note = 'No listed stack has been kept by 3 people like you yet.';
    else if (input.segment === 'top') note = 'Top fills in once people copy and keep listed stacks.';
  }
  return { items, nextOffset: rows.length > limit ? offset + limit : null, note };
}

function ageRangesFor(group: string): string[] {
  if (group === 'under_40') return ['18_29', '30_39'];
  if (group === '40_59') return ['40_49', '50_59'];
  return ['60_plus'];
}

function likeYouLine(metrics: { label: string; slices: CohortSlice[] }[], cohort: string): { label: string; line: string } | null {
  for (const metric of metrics) {
    const slice = metric.slices.find((item) => item.key === cohort);
    if (slice) return { label: slice.label, line: slice.line };
  }
  return null;
}

function parseCard(raw: string): ShareCard {
  try {
    const parsed = JSON.parse(raw) as Partial<ShareCard>;
    return {
      productCount: typeof parsed.productCount === 'number' ? parsed.productCount : 0,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      composition: Array.isArray(parsed.composition) ? parsed.composition.slice(0, 8) : [],
    };
  } catch {
    return { productCount: 0, summary: '', composition: [] };
  }
}

function toItem(row: ShareListRow): LibraryItem {
  const goals = row.goals
    .split(' ')
    .filter((key): key is LibraryGoal => (LIBRARY_GOALS as readonly string[]).includes(key))
    .map((key) => ({ key, label: GOAL_LABELS[key] }));
  const card = parseCard(row.card);
  return {
    slug: row.slug,
    stackName: row.stack_name,
    creatorName: row.creator_name || null,
    goals,
    auditScore: row.audit_score,
    summary: card.summary,
    productCount: card.productCount,
    composition: card.composition,
    copyCount: shownCopies(row.kept_count),
    saved: false,
    updatedOn: row.version > 1 ? row.updated_at.slice(0, 10) : null,
    likeYou: null,
  };
}

async function attachSaved(db: D1Database, items: LibraryItem[], rows: ShareListRow[], viewerId: string | null): Promise<void> {
  if (!viewerId || rows.length === 0) return;
  const ids = rows.map((row) => row.id);
  const saved = await db
    .prepare(`SELECT share_id FROM share_saves WHERE user_id = ? AND share_id IN (${ids.map(() => '?').join(', ')})`)
    .bind(viewerId, ...ids)
    .all<{ share_id: string }>();
  const set = new Set((saved.results ?? []).map((row) => row.share_id));
  rows.forEach((row, index) => {
    const item = items[index];
    if (item) item.saved = set.has(row.id);
  });
}

type LiveShare = { id: string; user_id: string; listed: number; hidden_at: string | null; version: number };

async function liveBySlug(db: D1Database, slug: string): Promise<LiveShare | null> {
  if (!/^[a-f0-9]{32,64}$/.test(slug)) return null;
  const row = await db
    .prepare('SELECT id, user_id, listed, hidden_at, version, revoked_at FROM shares WHERE slug = ?')
    .bind(slug)
    .first<LiveShare & { revoked_at: string | null }>();
  if (!row || row.revoked_at) return null;
  return row;
}

/** Any live share can be saved. Saves of unlisted shares are kept and simply not shown in Discover. */
export async function setSaved(db: D1Database, slug: string, userId: string, saved: boolean): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const row = await liveBySlug(db, slug);
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (saved) {
    await db
      .prepare('INSERT INTO share_saves (share_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT(share_id, user_id) DO NOTHING')
      .bind(row.id, userId, new Date().toISOString())
      .run();
  } else {
    await db.prepare('DELETE FROM share_saves WHERE share_id = ? AND user_id = ?').bind(row.id, userId).run();
  }
  return { ok: true };
}

export async function reportShare(
  db: D1Database,
  slug: string,
  userId: string,
  reason: unknown,
  note: unknown,
): Promise<{ ok: true; hidden: boolean } | { ok: false; error: string; status: number }> {
  if (!isReportReason(reason)) return { ok: false, error: 'Choose a reason.', status: 400 };
  const row = await liveBySlug(db, slug);
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (row.user_id === userId) return { ok: false, error: 'You cannot report your own stack.', status: 400 };
  const detail = typeof note === 'string' ? note.trim().slice(0, 200) : '';
  const text = detail ? `${reason}: ${detail}` : reason;
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO share_reports (share_id, user_id, reason, created_at, version, resolved_at) VALUES (?, ?, ?, ?, ?, NULL)
       ON CONFLICT(share_id, user_id) DO UPDATE SET reason = excluded.reason, created_at = excluded.created_at,
         version = excluded.version, resolved_at = NULL`,
    )
    .bind(row.id, userId, text, now, row.version)
    .run();
  const open = await db
    .prepare('SELECT COUNT(*) AS n FROM share_reports WHERE share_id = ? AND resolved_at IS NULL')
    .bind(row.id)
    .first<{ n: number }>();
  if ((open?.n ?? 0) >= AUTO_HIDE_REPORTS && !row.hidden_at) {
    await db.batch([
      db.prepare("UPDATE shares SET hidden_at = ?, review_status = 'pending' WHERE id = ?").bind(now, row.id),
      db
        .prepare('INSERT INTO moderation_log (id, share_id, action, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(randomId(), row.id, 'auto_hide', `${open?.n ?? 0} open reports`, now),
    ]);
    await syncSearchRow(db, row.id);
    return { ok: true, hidden: true };
  }
  return { ok: true, hidden: Boolean(row.hidden_at) };
}

export async function blockCreator(db: D1Database, slug: string, userId: string, blocked: boolean): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!/^[a-f0-9]{32,64}$/.test(slug)) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  const row = await db.prepare('SELECT user_id FROM shares WHERE slug = ?').bind(slug).first<{ user_id: string }>();
  if (!row) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  if (row.user_id === userId) return { ok: false, error: 'You cannot block yourself.', status: 400 };
  if (blocked) {
    await db
      .prepare('INSERT INTO user_blocks (user_id, blocked_user_id, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id, blocked_user_id) DO NOTHING')
      .bind(userId, row.user_id, new Date().toISOString())
      .run();
  } else {
    await db.prepare('DELETE FROM user_blocks WHERE user_id = ? AND blocked_user_id = ?').bind(userId, row.user_id).run();
  }
  return { ok: true };
}
