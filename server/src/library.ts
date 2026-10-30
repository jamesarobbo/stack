import { AGGREGATE_MIN_WINDOW, MIN_PEOPLE, cohortLine, isOutcomeMetric } from './outcome';

const AGE_RANGES = ['18_29', '30_39', '40_49', '50_59', '60_plus', 'unspecified'];
const SEXES = ['female', 'male', 'unspecified'];

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

const PAGE_MAX = 50;

export type LibraryTab = 'new' | 'top' | 'saved';
export type LibrarySort = 'newest' | 'score' | 'copies' | 'like_you';

export type LibraryItem = {
  slug: string;
  stackName: string;
  creatorName: string | null;
  goals: { key: LibraryGoal; label: string }[];
  auditScore: number;
  copyCount: number;
  recentCopies: number;
  saved: boolean;
  likeYou: { averagePercent: number; metric: string; people: number; cohort: string } | null;
};

export type LibraryPage = {
  items: LibraryItem[];
  nextOffset: number | null;
  note: string | null;
};

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

/** FTS5 query. "has magnesium" searches the ingredient column only. */
export function ftsMatch(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const has = /^has\s+(.+)$/.exec(trimmed);
  const source = has ? has[1] : trimmed;
  const tokens = (source ?? '').split(/[^a-z0-9]+/).filter((token) => token.length > 1);
  if (tokens.length === 0) return null;
  const terms = tokens.map((token) => `"${token}"*`).join(' AND ');
  return has ? `ingredients: ${terms}` : terms;
}

export async function indexShare(
  db: D1Database,
  input: {
    id: string;
    listed: boolean;
    stackName: string;
    creatorName: string;
    goals: LibraryGoal[];
    ingredients: string;
    auditScore: number;
  },
): Promise<void> {
  const goals = input.goals.join(' ');
  await db
    .prepare(
      `UPDATE shares
       SET listed = ?, public_index = ?, stack_name = ?, creator_name = ?, goals = ?, ingredients = ?, audit_score = ?
       WHERE id = ?`,
    )
    .bind(
      input.listed ? 1 : 0,
      input.listed ? 1 : 0,
      input.stackName,
      input.creatorName,
      goals,
      input.ingredients,
      input.auditScore,
      input.id,
    )
    .run();
  await db.prepare('DELETE FROM share_search WHERE share_id = ?').bind(input.id).run();
  if (!input.listed) {
    await db.prepare('DELETE FROM share_saves WHERE share_id = ?').bind(input.id).run();
    return;
  }
  await db
    .prepare('INSERT INTO share_search(share_id, stack_name, creator_name, goals, ingredients) VALUES (?, ?, ?, ?, ?)')
    .bind(input.id, input.stackName, input.creatorName, goals, input.ingredients)
    .run();
}

export async function dropFromLibrary(db: D1Database, shareId: string): Promise<void> {
  await db.prepare('UPDATE shares SET listed = 0, public_index = 0 WHERE id = ?').bind(shareId).run();
  await db.prepare('DELETE FROM share_search WHERE share_id = ?').bind(shareId).run();
  await db.prepare('DELETE FROM share_saves WHERE share_id = ?').bind(shareId).run();
}

export async function searchLibrary(
  db: D1Database,
  input: {
    tab: LibraryTab;
    q?: string;
    goal?: string;
    sort?: LibrarySort;
    ageRange?: string | null;
    sex?: string | null;
    limit?: number;
    offset?: number;
    viewerId?: string | null;
    now?: string;
  },
): Promise<LibraryPage> {
  const limit = Math.min(PAGE_MAX, Math.max(1, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  const sort = input.sort ?? (input.tab === 'top' ? 'copies' : 'newest');
  const goal = (LIBRARY_GOALS as readonly string[]).includes(input.goal ?? '') ? input.goal : null;
  const match = input.q ? ftsMatch(input.q) : null;
  if (input.q && input.q.trim() && !match) {
    return { items: [], nextOffset: null, note: 'No stacks match that search.' };
  }

  if (input.tab === 'saved' && !input.viewerId) {
    return { items: [], nextOffset: null, note: 'Sign in to see saved stacks.' };
  }

  if (sort === 'like_you') {
    if (!input.ageRange || !input.sex || !AGE_RANGES.includes(input.ageRange) || !SEXES.includes(input.sex) || input.ageRange === 'unspecified' || input.sex === 'unspecified') {
      return { items: [], nextOffset: null, note: 'Add an age range and sex to sort by people like you.' };
    }
  }

  const since = new Date(Date.parse(input.now ?? new Date().toISOString()) - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params: unknown[] = [];
  let where = input.tab === 'saved' ? 's.listed = 1 AND s.revoked_at IS NULL AND v.user_id = ?' : 's.listed = 1 AND s.revoked_at IS NULL';
  if (input.tab === 'saved') params.push(input.viewerId);
  if (match) {
    where += ' AND s.id IN (SELECT share_id FROM share_search WHERE share_search MATCH ?)';
    params.push(match);
  }
  if (goal) {
    where += ` AND instr(' ' || s.goals || ' ', ' ' || ? || ' ') > 0`;
    params.push(goal);
  }

  const from = input.tab === 'saved' ? 'shares s JOIN share_saves v ON v.share_id = s.id' : 'shares s';
  const order =
    sort === 'score'
      ? 's.audit_score DESC, s.created_at DESC'
      : sort === 'copies'
        ? 'recent_copies DESC, s.created_at DESC'
        : input.tab === 'saved' && sort === 'newest'
          ? 'v.created_at DESC'
          : 's.created_at DESC';

  if (sort === 'like_you') {
    const rows = await db
      .prepare(
        `SELECT s.id, s.slug, s.user_id, s.stack_name, s.creator_name, s.goals, s.audit_score, s.created_at,
                (SELECT COUNT(*) FROM share_copies c WHERE c.share_id = s.id AND c.user_id != s.user_id) AS copy_count,
                (SELECT COUNT(*) FROM share_copies c WHERE c.share_id = s.id AND c.user_id != s.user_id AND c.copied_at >= ?) AS recent_copies
         FROM ${from}
         WHERE ${where}`,
      )
      .bind(since, ...params)
      .all<ShareListRow>();
    const ranked = await rankLikeYou(db, rows.results ?? [], input.ageRange ?? '', input.sex ?? '');
    const page = ranked.slice(offset, offset + limit);
    const items = await attachSaved(db, page, input.viewerId ?? null);
    return {
      items,
      nextOffset: offset + limit < ranked.length ? offset + limit : null,
      note: ranked.length === 0 ? 'No listed stack has 10 people like you yet.' : null,
    };
  }

  const listed = await db
    .prepare(
      `SELECT s.id, s.slug, s.user_id, s.stack_name, s.creator_name, s.goals, s.audit_score, s.created_at,
              (SELECT COUNT(*) FROM share_copies c WHERE c.share_id = s.id AND c.user_id != s.user_id) AS copy_count,
              (SELECT COUNT(*) FROM share_copies c WHERE c.share_id = s.id AND c.user_id != s.user_id AND c.copied_at >= ?) AS recent_copies
       FROM ${from}
       WHERE ${where}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`,
    )
    .bind(since, ...params, limit + 1, offset)
    .all<ShareListRow>();
  const rows = listed.results ?? [];
  const page = rows.slice(0, limit).map((row) => toItem(row, false));
  return {
    items: await attachSaved(db, page, input.viewerId ?? null),
    nextOffset: rows.length > limit ? offset + limit : null,
    note: page.length === 0 && (match || goal) ? 'No stacks match that search.' : null,
  };
}

type ShareListRow = {
  id: string;
  slug: string;
  user_id: string;
  stack_name: string;
  creator_name: string;
  goals: string;
  audit_score: number;
  created_at: string;
  copy_count: number;
  recent_copies: number;
};

async function rankLikeYou(db: D1Database, rows: ShareListRow[], ageRange: string, sex: string): Promise<LibraryItem[]> {
  if (rows.length === 0) return [];
  const outcomes = await db
    .prepare(
      `SELECT share_id, metric, AVG(percent_change) AS avg_pct, COUNT(*) AS n
       FROM share_outcomes
       WHERE age_range = ? AND sex = ? AND window_days >= ?
       GROUP BY share_id, metric
       HAVING COUNT(*) >= ?`,
    )
    .bind(ageRange, sex, AGGREGATE_MIN_WINDOW, MIN_PEOPLE)
    .all<{ share_id: string; metric: string; avg_pct: number; n: number }>();
  const best = new Map<string, { metric: string; avg_pct: number; n: number }>();
  for (const row of outcomes.results ?? []) {
    if (!isOutcomeMetric(row.metric)) continue;
    const current = best.get(row.share_id);
    if (!current || row.n > current.n) best.set(row.share_id, { metric: row.metric, avg_pct: row.avg_pct, n: row.n });
  }
  const cohort = cohortLine([{ ageRange, sex }]);
  return rows
    .filter((row) => best.has(row.id))
    .map((row) => {
      const outcome = best.get(row.id)!;
      return {
        ...toItem(row, false),
        likeYou: {
          averagePercent: Math.round(outcome.avg_pct),
          metric: outcome.metric,
          people: outcome.n,
          cohort,
        },
      };
    })
    .sort((a, b) => (b.likeYou?.averagePercent ?? 0) - (a.likeYou?.averagePercent ?? 0) || b.auditScore - a.auditScore);
}

function toItem(row: ShareListRow, saved: boolean): LibraryItem {
  const goals = row.goals
    .split(' ')
    .filter((key): key is LibraryGoal => (LIBRARY_GOALS as readonly string[]).includes(key))
    .map((key) => ({ key, label: GOAL_LABELS[key] }));
  return {
    slug: row.slug,
    stackName: row.stack_name,
    creatorName: row.creator_name || null,
    goals,
    auditScore: row.audit_score,
    copyCount: row.copy_count,
    recentCopies: row.recent_copies,
    saved,
    likeYou: null,
  };
}

async function attachSaved(db: D1Database, items: LibraryItem[], viewerId: string | null): Promise<LibraryItem[]> {
  if (!viewerId || items.length === 0) return items;
  const saved = await db.prepare('SELECT share_id FROM share_saves WHERE user_id = ?').bind(viewerId).all<{ share_id: string }>();
  const slugs = new Set<string>();
  const ids = new Map<string, string>();
  const rows = await db.prepare('SELECT id, slug FROM shares WHERE listed = 1').bind().all<{ id: string; slug: string }>();
  for (const row of rows.results ?? []) ids.set(row.id, row.slug);
  for (const row of saved.results ?? []) {
    const slug = ids.get(row.share_id);
    if (slug) slugs.add(slug);
  }
  return items.map((item) => ({ ...item, saved: slugs.has(item.slug) }));
}

export async function setSaved(db: D1Database, slug: string, userId: string, saved: boolean): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const row = await db
    .prepare('SELECT id, user_id, listed, revoked_at FROM shares WHERE slug = ?')
    .bind(slug)
    .first<{ id: string; user_id: string; listed: number; revoked_at: string | null }>();
  if (!row || row.revoked_at || row.listed !== 1) return { ok: false, error: 'That stack is not listed.', status: 404 };
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
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const text = typeof reason === 'string' ? reason.trim().slice(0, 200) : '';
  if (!text) return { ok: false, error: 'Add a short reason.', status: 400 };
  const row = await db
    .prepare('SELECT id, revoked_at FROM shares WHERE slug = ?')
    .bind(slug)
    .first<{ id: string; revoked_at: string | null }>();
  if (!row || row.revoked_at) return { ok: false, error: 'This stack is no longer shared.', status: 404 };
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO share_reports (share_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(share_id, user_id) DO UPDATE SET reason = excluded.reason, created_at = excluded.created_at`,
    )
    .bind(row.id, userId, text, now)
    .run();
  return { ok: true };
}
