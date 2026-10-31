/**
 * Personal before and after result. See docs/personal-outcome.md.
 * Computed on the phone. The Worker only receives the derived headline fields,
 * validates them, and writes the line itself with outcomeLine.
 */

export const OUTCOME_METRICS = ['resting_hr_bpm', 'hrv_sdnn_ms', 'deep_sleep_min'] as const;
export type OutcomeMetric = (typeof OUTCOME_METRICS)[number];

export const WINDOW_DAYS = 84;
export const LEAD_IN_DAYS = 14;
export const MIN_BEFORE_MEASURED = 56;
export const MIN_AFTER_MEASURED = 42;
/** The after window closes this many days after the start date (inclusive of the start). */
export const READY_AFTER_DAYS = LEAD_IN_DAYS + WINDOW_DAYS;
/** Days of Apple Health history the app reads. Enough for a baseline, a full after window, and a noise estimate. */
export const HISTORY_DAYS = 400;
/** Largest change the Worker accepts. Anything bigger is a data problem, not a result. */
export const MAX_PERCENT = 60;

export const PERSONAL_DISCLAIMER = '1 person, not a trial';
export const PERSONAL_FRAMING = 'What changed for me';

/** Smallest change that reads as a change when there is too little history to measure normal variation. */
export const NOISE_FLOOR: Record<OutcomeMetric, number> = {
  resting_hr_bpm: 3,
  hrv_sdnn_ms: 8,
  deep_sleep_min: 10,
};

export const OUTCOME_LABELS: Record<OutcomeMetric, string> = {
  resting_hr_bpm: 'Resting heart rate',
  hrv_sdnn_ms: 'Heart rate variability',
  deep_sleep_min: 'Deep sleep',
};

export type DayValue = { date: string; value: number };

export type OutcomeFields = {
  metric: OutcomeMetric;
  direction: 'up' | 'down' | 'flat';
  percent: number;
  withinNormal: boolean;
  windowDays: number;
  device: string;
};

export type OutcomeResult = OutcomeFields & {
  eligible: true;
  label: string;
  line: string;
  disclaimer: typeof PERSONAL_DISCLAIMER;
  framing: typeof PERSONAL_FRAMING;
};

export type OutcomeMiss = { eligible: false; metric: OutcomeMetric; reason: string; readyOn: string | null };

export function isOutcomeMetric(value: unknown): value is OutcomeMetric {
  return typeof value === 'string' && (OUTCOME_METRICS as readonly string[]).includes(value);
}

export function computeOutcome(input: {
  metric: OutcomeMetric;
  samples: DayValue[];
  stackStart: string;
  device: string;
  asOf: string;
}): OutcomeResult | OutcomeMiss {
  const miss = (reason: string, readyOn: string | null = null): OutcomeMiss => ({ eligible: false, metric: input.metric, reason, readyOn });
  if (!isoDate(input.stackStart) || !isoDate(input.asOf)) return miss('Not enough wearable data yet.');
  const byDay = dailyValues(input.samples);
  const readyOn = addDays(input.stackStart, READY_AFTER_DAYS - 1);
  const change = windowChange(byDay, input.stackStart);
  if (change === 'no_before') return miss('Not enough wearable data in the 12 weeks before the stack started.');
  if (input.asOf < readyOn) return miss('The 12 week window after the start is not finished yet.', readyOn);
  if (change === 'no_after') return miss('Not enough wearable data in the 12 weeks after the start.');

  const threshold = noiseThreshold(byDay, input.stackStart, input.metric);
  const withinNormal = Math.abs(change) < threshold;
  const percent = Math.round(change);
  const fields: OutcomeFields = {
    metric: input.metric,
    direction: directionOf(percent, withinNormal),
    percent,
    withinNormal,
    windowDays: WINDOW_DAYS,
    device: cleanDevice(input.device),
  };
  return {
    ...fields,
    eligible: true,
    label: OUTCOME_LABELS[input.metric],
    line: outcomeLine(fields),
    disclaimer: PERSONAL_DISCLAIMER,
    framing: PERSONAL_FRAMING,
  };
}

export function directionOf(percent: number, withinNormal: boolean): 'up' | 'down' | 'flat' {
  if (withinNormal) return 'flat';
  if (percent <= -1) return 'down';
  if (percent >= 1) return 'up';
  return 'flat';
}

/** Short line for a Discover card. No device, and a flat change is not called an improvement. */
export function discoverOutcomeLine(fields: Pick<OutcomeFields, 'metric' | 'direction' | 'percent' | 'withinNormal'>): string {
  const label = OUTCOME_LABELS[fields.metric];
  if (fields.withinNormal || fields.direction === 'flat') {
    return `${label} showed no clear change over 12 weeks`;
  }
  return `${label} ${fields.direction} ${Math.abs(fields.percent)}% over 12 weeks`;
}

export function outcomeLine(fields: Pick<OutcomeFields, 'metric' | 'direction' | 'percent' | 'withinNormal' | 'device'>): string {
  const label = OUTCOME_LABELS[fields.metric];
  const device = cleanDevice(fields.device);
  if (fields.withinNormal || fields.direction === 'flat') {
    return `${label} stayed within normal variation over 12 weeks, measured on ${device}`;
  }
  return `${label} ${fields.direction} ${Math.abs(fields.percent)}% over 12 weeks, measured on ${device}`;
}

/** Strict check of client fields. Returns the fields the Worker stores, or null. */
export function validateOutcomeFields(raw: unknown): OutcomeFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  if (!isOutcomeMetric(body.metric)) return null;
  if (body.windowDays !== WINDOW_DAYS) return null;
  if (typeof body.percent !== 'number' || !Number.isInteger(body.percent) || Math.abs(body.percent) > MAX_PERCENT) return null;
  if (typeof body.withinNormal !== 'boolean') return null;
  const direction = directionOf(body.percent, body.withinNormal);
  if (body.direction !== direction) return null;
  if (!body.withinNormal && Math.abs(body.percent) < NOISE_FLOOR[body.metric]) return null;
  return {
    metric: body.metric,
    direction,
    percent: body.percent,
    withinNormal: body.withinNormal,
    windowDays: WINDOW_DAYS,
    device: cleanDevice(typeof body.device === 'string' ? body.device : ''),
  };
}

type Change = number | 'no_before' | 'no_after';

function windowChange(byDay: Map<string, number>, start: string): Change {
  const before = medianIn(byDay, addDays(start, -WINDOW_DAYS), addDays(start, -1));
  if (before.days < MIN_BEFORE_MEASURED || before.median == null || before.median <= 0) return 'no_before';
  const after = medianIn(byDay, addDays(start, LEAD_IN_DAYS), addDays(start, READY_AFTER_DAYS - 1));
  if (after.days < MIN_AFTER_MEASURED || after.median == null) return 'no_after';
  return ((after.median - before.median) / before.median) * 100;
}

/**
 * The same change measured at earlier pretend start dates, every 2 weeks, entirely before the real start.
 * A change smaller than the 80th percentile of those reads as normal variation.
 */
function noiseThreshold(byDay: Map<string, number>, start: string, metric: OutcomeMetric): number {
  const changes: number[] = [];
  for (let step = 7; step < 40; step += 1) {
    const pretend = addDays(start, -14 * step);
    const change = windowChange(byDay, pretend);
    if (typeof change === 'number') changes.push(Math.abs(change));
  }
  const floor = NOISE_FLOOR[metric];
  if (changes.length < 4) return floor;
  changes.sort((a, b) => a - b);
  const index = Math.min(changes.length - 1, Math.ceil(changes.length * 0.8) - 1);
  return Math.max(floor, changes[index] ?? floor);
}

function dailyValues(samples: DayValue[]): Map<string, number> {
  const grouped = new Map<string, number[]>();
  for (const sample of samples) {
    if (!isoDate(sample.date) || !Number.isFinite(sample.value)) continue;
    const list = grouped.get(sample.date) ?? [];
    list.push(sample.value);
    grouped.set(sample.date, list);
  }
  const byDay = new Map<string, number>();
  for (const [date, values] of grouped) byDay.set(date, values.reduce((sum, value) => sum + value, 0) / values.length);
  return byDay;
}

function medianIn(byDay: Map<string, number>, start: string, end: string): { days: number; median: number | null } {
  const values: number[] = [];
  for (const [date, value] of byDay) {
    if (date >= start && date <= end) values.push(value);
  }
  if (values.length === 0) return { days: 0, median: null };
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 1 ? (values[mid] ?? 0) : ((values[mid - 1] ?? 0) + (values[mid] ?? 0)) / 2;
  return { days: values.length, median };
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function cleanDevice(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9 .]/g, '').trim().slice(0, 40);
  return cleaned || 'Apple Health';
}
