/**
 * Copier results grouped into fixed cohorts. See docs/personal-outcome.md.
 *
 * Differencing protection:
 * - Only fixed slices exist (everyone, by sex, by sex and age group). Callers cannot ask for any other filter.
 * - A slice is shown only with at least MIN_PEOPLE people, and only when the people of its parent slice
 *   who fall outside it (and outside the other shown slices) are zero or at least MIN_PEOPLE.
 * - The median is reported as a 5 point band and the head count as a band.
 * - Results are recomputed once per UTC day from submissions made before that day began.
 */

import { OUTCOME_LABELS, OUTCOME_METRICS, type OutcomeMetric } from '../../shared/outcome';

export const MIN_PEOPLE = 10;
export const COHORT_DISCLAIMER = 'Real-world data from people who copied this stack, not a trial';

export type CohortKey =
  | 'all'
  | 'female'
  | 'male'
  | 'female_under_40'
  | 'female_40_59'
  | 'female_60_plus'
  | 'male_under_40'
  | 'male_40_59'
  | 'male_60_plus';

const COHORT_LABELS: Record<CohortKey, string> = {
  all: 'Everyone who copied it',
  female: 'Women',
  male: 'Men',
  female_under_40: 'Women under 40',
  female_40_59: 'Women 40 to 59',
  female_60_plus: 'Women 60 plus',
  male_under_40: 'Men under 40',
  male_40_59: 'Men 40 to 59',
  male_60_plus: 'Men 60 plus',
};

export type CohortRow = { userId: string; metric: string; percent: number; ageRange: string; sex: string };

export type CohortSlice = {
  key: CohortKey;
  label: string;
  people: string;
  direction: 'up' | 'down' | 'flat';
  band: string;
  line: string;
};

export type MetricCohorts = { metric: OutcomeMetric; label: string; slices: CohortSlice[] };

export type CohortReport = { day: string; metrics: MetricCohorts[]; disclaimer: string };

export function ageGroup(ageRange: string): 'under_40' | '40_59' | '60_plus' | null {
  if (ageRange === '18_29' || ageRange === '30_39') return 'under_40';
  if (ageRange === '40_49' || ageRange === '50_59') return '40_59';
  if (ageRange === '60_plus') return '60_plus';
  return null;
}

export function cohortKeyFor(ageRange: string | null | undefined, sex: string | null | undefined): CohortKey | null {
  if (sex !== 'female' && sex !== 'male') return null;
  const group = ageGroup(ageRange ?? '');
  return group ? (`${sex}_${group}` as CohortKey) : null;
}

export function buildCohorts(rows: CohortRow[], day: string): CohortReport {
  const metrics: MetricCohorts[] = [];
  for (const metric of OUTCOME_METRICS) {
    const list = dedupe(rows.filter((row) => row.metric === metric && Number.isFinite(row.percent)));
    const slices = sliceMetric(list);
    if (slices.length === 0) continue;
    const label = OUTCOME_LABELS[metric];
    metrics.push({
      metric,
      label,
      slices: slices.map(({ key, values }) => describe(key, label, values)),
    });
  }
  return { day, metrics, disclaimer: COHORT_DISCLAIMER };
}

type Slice = { key: CohortKey; values: number[] };

function sliceMetric(rows: CohortRow[]): Slice[] {
  if (rows.length < MIN_PEOPLE) return [];
  const shown: Slice[] = [{ key: 'all', values: rows.map((row) => row.percent) }];
  const bySex = (['female', 'male'] as const).map((sex) => ({ sex, rows: rows.filter((row) => row.sex === sex) }));
  const sexShown = suppress(
    rows.length,
    bySex.map(({ sex, rows: list }) => ({ key: sex as CohortKey, count: list.length })),
  );
  for (const { sex, rows: list } of bySex) {
    if (!sexShown.has(sex)) continue;
    shown.push({ key: sex, values: list.map((row) => row.percent) });
    const groups = (['under_40', '40_59', '60_plus'] as const).map((group) => ({
      key: `${sex}_${group}` as CohortKey,
      rows: list.filter((row) => ageGroup(row.ageRange) === group),
    }));
    const groupShown = suppress(
      list.length,
      groups.map((group) => ({ key: group.key, count: group.rows.length })),
    );
    for (const group of groups) {
      if (groupShown.has(group.key)) shown.push({ key: group.key, values: group.rows.map((row) => row.percent) });
    }
  }
  return shown;
}

/**
 * Children of one parent slice that can be shown together.
 * Each shown child needs MIN_PEOPLE, the parent minus that child must be 0 or at least MIN_PEOPLE,
 * and the parent minus every shown child must also be 0 or at least MIN_PEOPLE.
 */
export function suppress(parentCount: number, children: { key: CohortKey; count: number }[]): Set<CohortKey> {
  let candidates = children.filter((child) => child.count >= MIN_PEOPLE).sort((a, b) => b.count - a.count);
  while (candidates.length > 0) {
    const remainder = parentCount - candidates.reduce((sum, child) => sum + child.count, 0);
    const childLeaks = candidates.some((child) => {
      const outside = parentCount - child.count;
      return outside > 0 && outside < MIN_PEOPLE;
    });
    const remainderLeaks = remainder > 0 && remainder < MIN_PEOPLE;
    if (!childLeaks && !remainderLeaks) break;
    candidates = candidates.slice(0, -1);
  }
  return new Set(candidates.map((child) => child.key));
}

function dedupe(rows: CohortRow[]): CohortRow[] {
  const seen = new Map<string, CohortRow>();
  for (const row of rows) seen.set(row.userId, row);
  return [...seen.values()];
}

function describe(key: CohortKey, label: string, values: number[]): CohortSlice {
  const middle = median(values);
  const { direction, band } = percentBand(middle);
  const people = peopleBand(values.length);
  return {
    key,
    label: COHORT_LABELS[key],
    people,
    direction,
    band,
    line: `Typical change in ${label.toLowerCase()}: ${band}, ${people}`,
  };
}

export function percentBand(value: number): { direction: 'up' | 'down' | 'flat'; band: string } {
  const size = Math.abs(value);
  if (size < 2.5) return { direction: 'flat', band: 'about the same' };
  const direction = value < 0 ? 'down' : 'up';
  const low = Math.floor(size / 5) * 5;
  if (low === 0) return { direction, band: `${direction} by less than 5%` };
  return { direction, band: `${direction} ${low} to ${low + 5}%` };
}

export function peopleBand(count: number): string {
  if (count >= 100) return '100 or more people';
  if (count >= 50) return '50 to 99 people';
  if (count >= 20) return '20 to 49 people';
  return '10 to 19 people';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Cached once per UTC day per share version. */
export async function cohortsForShare(
  db: D1Database,
  share: { id: string; userId: string; materialVersion: number },
  now = new Date(),
): Promise<CohortReport> {
  const day = utcDay(now);
  const cached = await db
    .prepare('SELECT day, payload FROM share_cohort_cache WHERE share_id = ? AND material_version = ?')
    .bind(share.id, share.materialVersion)
    .first<{ day: string; payload: string }>();
  if (cached && cached.day === day) {
    try {
      return JSON.parse(cached.payload) as CohortReport;
    } catch {
      // Recompute below.
    }
  }
  const cutoff = `${day}T00:00:00.000Z`;
  const listed = await db
    .prepare(
      `SELECT user_id, metric, percent_change, age_range, sex FROM copier_outcomes
       WHERE share_id = ? AND material_version = ? AND user_id != ? AND submitted_at < ?`,
    )
    .bind(share.id, share.materialVersion, share.userId, cutoff)
    .all<{ user_id: string; metric: string; percent_change: number; age_range: string; sex: string }>();
  const report = buildCohorts(
    (listed.results ?? []).map((row) => ({
      userId: row.user_id,
      metric: row.metric,
      percent: row.percent_change,
      ageRange: row.age_range,
      sex: row.sex,
    })),
    day,
  );
  await db
    .prepare(
      `INSERT INTO share_cohort_cache (share_id, material_version, day, payload) VALUES (?, ?, ?, ?)
       ON CONFLICT(share_id, material_version) DO UPDATE SET day = excluded.day, payload = excluded.payload`,
    )
    .bind(share.id, share.materialVersion, day, JSON.stringify(report))
    .run();
  return report;
}