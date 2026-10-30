/**
 * Personal relative change and the copier average.
 * See docs/personal-outcome.md. Samples are not stored by this module.
 */

export const PERSONAL_DISCLAIMER = '1 person, not a trial';
export const AGGREGATE_DISCLAIMER = 'Real-world data, not a trial';
export const PERSONAL_FRAMING = 'What changed for me';
export const MIN_PEOPLE = 10;
export const MIN_BEFORE_DAYS = 60;
export const BEFORE_WINDOW_DAYS = 90;
export const AFTER_WINDOW_DAYS = 90;
export const MIN_AFTER_ELAPSED = 60;
export const MIN_AFTER_MEASURED = 21;
export const AGGREGATE_MIN_WINDOW = 90;

export const OUTCOME_METRICS = [
  'resting_hr_bpm',
  'hrv_sdnn_ms',
  'deep_sleep_min',
  'vo2_max',
  'steps',
  'active_energy_kcal',
] as const;

export type OutcomeMetric = (typeof OUTCOME_METRICS)[number];

export type DayValue = { date: string; value: number };

export type PersonalResult = {
  eligible: true;
  metric: OutcomeMetric;
  label: string;
  direction: 'up' | 'down' | 'flat';
  percent: number;
  windowDays: number;
  device: string;
  line: string;
  disclaimer: typeof PERSONAL_DISCLAIMER;
  framing: typeof PERSONAL_FRAMING;
};

export type PersonalMiss = { eligible: false; reason: string };

const LABELS: Record<OutcomeMetric, string> = {
  resting_hr_bpm: 'Resting heart rate',
  hrv_sdnn_ms: 'Heart rate variability',
  deep_sleep_min: 'Deep sleep',
  vo2_max: 'VO2 max',
  steps: 'Steps',
  active_energy_kcal: 'Active energy',
};

export function isOutcomeMetric(value: unknown): value is OutcomeMetric {
  return typeof value === 'string' && (OUTCOME_METRICS as readonly string[]).includes(value);
}

export function personalOutcome(input: {
  metric: OutcomeMetric;
  samples: DayValue[];
  stackStart: string;
  device: string;
  asOf: string;
}): PersonalResult | PersonalMiss {
  if (!isoDate(input.stackStart) || !isoDate(input.asOf)) {
    return { eligible: false, reason: 'Not enough wearable data yet.' };
  }
  const beforeStart = addDays(input.stackStart, -BEFORE_WINDOW_DAYS);
  const beforeEnd = addDays(input.stackStart, -1);
  const before = dailyMeans(input.samples, beforeStart, beforeEnd);
  if (before.days < MIN_BEFORE_DAYS || before.mean == null || before.mean <= 0) {
    return { eligible: false, reason: 'Not enough wearable data before the stack started.' };
  }
  const elapsed = daysInclusive(input.stackStart, input.asOf);
  if (elapsed < MIN_AFTER_ELAPSED) {
    return { eligible: false, reason: 'Not enough days after the stack started.' };
  }
  const afterEnd = addDays(input.stackStart, Math.min(AFTER_WINDOW_DAYS, elapsed) - 1);
  const after = dailyMeans(input.samples, input.stackStart, afterEnd);
  if (after.days < MIN_AFTER_MEASURED || after.mean == null) {
    return { eligible: false, reason: 'Not enough wearable data after the stack started.' };
  }
  const percent = Math.round(((after.mean - before.mean) / before.mean) * 100);
  const direction = percent <= -1 ? 'down' : percent >= 1 ? 'up' : 'flat';
  const windowDays = daysInclusive(input.stackStart, afterEnd);
  const device = cleanDevice(input.device);
  const label = LABELS[input.metric];
  const line =
    direction === 'flat'
      ? `${label} about the same over ${windowDays} days, measured on ${device}`
      : `${label} ${direction} ${Math.abs(percent)}% over ${windowDays} days, measured on ${device}`;
  return {
    eligible: true,
    metric: input.metric,
    label,
    direction,
    percent,
    windowDays,
    device,
    line,
    disclaimer: PERSONAL_DISCLAIMER,
    framing: PERSONAL_FRAMING,
  };
}

export type OutcomeRow = {
  metric: OutcomeMetric;
  percentChange: number;
  windowDays: number;
  ageRange: string;
  sex: string;
};

export type AggregateResult = {
  metric: OutcomeMetric;
  label: string;
  direction: 'up' | 'down' | 'flat';
  averagePercent: number;
  people: number;
  cohort: string;
  line: string;
  disclaimer: typeof AGGREGATE_DISCLAIMER;
};

export function aggregateOutcomes(rows: OutcomeRow[], filter?: { ageRange?: string | null; sex?: string | null }): AggregateResult | null {
  const filtered = rows.filter((row) => {
    if (row.windowDays < AGGREGATE_MIN_WINDOW) return false;
    if (!Number.isFinite(row.percentChange)) return false;
    if (filter?.ageRange && row.ageRange !== filter.ageRange) return false;
    if (filter?.sex && row.sex !== filter.sex) return false;
    return true;
  });
  const byMetric = new Map<OutcomeMetric, OutcomeRow[]>();
  for (const row of filtered) {
    const list = byMetric.get(row.metric) ?? [];
    list.push(row);
    byMetric.set(row.metric, list);
  }
  let best: OutcomeRow[] = [];
  let bestMetric: OutcomeMetric | null = null;
  for (const metric of OUTCOME_METRICS) {
    const list = byMetric.get(metric) ?? [];
    if (list.length > best.length) {
      best = list;
      bestMetric = metric;
    }
  }
  if (!bestMetric || best.length < MIN_PEOPLE) return null;
  const averagePercent = Math.round(best.reduce((sum, row) => sum + row.percentChange, 0) / best.length);
  const direction = averagePercent <= -1 ? 'down' : averagePercent >= 1 ? 'up' : 'flat';
  const label = LABELS[bestMetric];
  const cohort = cohortLine(best);
  const change =
    direction === 'flat' ? `${label} about the same on average` : `Average change in ${label.toLowerCase()}: ${direction} ${Math.abs(averagePercent)}%`;
  return {
    metric: bestMetric,
    label,
    direction,
    averagePercent,
    people: best.length,
    cohort,
    line: `${change}. ${cohort}.`,
    disclaimer: AGGREGATE_DISCLAIMER,
  };
}

export function cohortLine(rows: { ageRange: string; sex: string }[]): string {
  if (rows.length === 0) return 'A mix of ages';
  const counts = new Map<string, { n: number; ageRange: string; sex: string }>();
  for (const row of rows) {
    const key = `${row.sex}|${row.ageRange}`;
    const current = counts.get(key) ?? { n: 0, ageRange: row.ageRange, sex: row.sex };
    current.n += 1;
    counts.set(key, current);
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  if (!top || top.n / rows.length < 0.4) return 'A mix of ages';
  const age = agePhrase(top.ageRange);
  if (!age) return 'A mix of ages';
  if (top.sex === 'male') return `Mostly men ${age}`;
  if (top.sex === 'female') return `Mostly women ${age}`;
  return `Mostly people ${age}`;
}

function agePhrase(ageRange: string): string | null {
  const phrases: Record<string, string> = {
    '18_29': '18 to 29',
    '30_39': '30 to 39',
    '40_49': '40 to 49',
    '50_59': '50 to 59',
    '60_plus': '60 plus',
  };
  return phrases[ageRange] ?? null;
}

function dailyMeans(samples: DayValue[], start: string, end: string): { days: number; mean: number | null } {
  const byDay = new Map<string, number[]>();
  for (const sample of samples) {
    if (!isoDate(sample.date) || sample.date < start || sample.date > end) continue;
    if (!Number.isFinite(sample.value)) continue;
    const list = byDay.get(sample.date) ?? [];
    list.push(sample.value);
    byDay.set(sample.date, list);
  }
  const means = [...byDay.values()].map((values) => values.reduce((sum, value) => sum + value, 0) / values.length);
  if (means.length === 0) return { days: 0, mean: null };
  return { days: means.length, mean: means.reduce((sum, value) => sum + value, 0) / means.length };
}

function daysInclusive(start: string, end: string): number {
  const span = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
  return span + 1;
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function cleanDevice(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9 .]/g, '').trim().slice(0, 40);
  return cleaned || 'Apple Health';
}
