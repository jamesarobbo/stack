import { addDays } from '../dates';
import type { HealthMetric, SampleInput, TagInput, Verdict } from './types';

export const BASELINE_DAYS = 21;
export const AFTER_DAYS = 21;
const STRONG_SLEEP_MIN = 10;
const WEAK_SLEEP_MIN = 5;
const STRONG_HRV_MS = 3;
const WEAK_HRV_MS = 2;
const STRONG_RHR_BPM = -2;
const WEAK_RHR_BPM = -1;
const DROP_WASTE_CENTS = 1000;
const HEAVY_ALCOHOL_RATIO = 0.3;

export type WindowStats = {
  start: string;
  end: string;
  days: number;
  mean: number | null;
  series: number[];
};

export type MetricComparison = {
  metric: HealthMetric;
  baseline: WindowStats;
  after: WindowStats;
  delta: number | null;
};

export type ConfounderSummary = {
  trainingLoadSimilar: boolean | null;
  alcoholDays: number;
  travelDays: number;
  hardTrainingDays: number;
  heavy: boolean;
};

export function windowRange(startDate: string, baselineDays = BASELINE_DAYS, afterDays = AFTER_DAYS) {
  return {
    baselineStart: addDays(startDate, -baselineDays),
    baselineEnd: addDays(startDate, -1),
    afterStart: startDate,
    afterEnd: addDays(startDate, afterDays - 1),
  };
}

export function compareMetric(
  samples: SampleInput[],
  metric: HealthMetric,
  startDate: string,
  baselineDays = BASELINE_DAYS,
  afterDays = AFTER_DAYS,
): MetricComparison {
  const range = windowRange(startDate, baselineDays, afterDays);
  const rows = samples.filter((sample) => sample.metric === metric);
  const baseline = summarize(rows, range.baselineStart, range.baselineEnd);
  const after = summarize(rows, range.afterStart, range.afterEnd);
  const delta = baseline.mean == null || after.mean == null ? null : after.mean - baseline.mean;
  return { metric, baseline, after, delta };
}

function summarize(samples: SampleInput[], start: string, end: string): WindowStats {
  const byDay = new Map<string, number[]>();
  for (const sample of samples) {
    if (sample.date < start || sample.date > end || !Number.isFinite(sample.value)) continue;
    const list = byDay.get(sample.date) ?? [];
    list.push(sample.value);
    byDay.set(sample.date, list);
  }
  const dates = [...byDay.keys()].sort();
  const series = dates.map((date) => {
    const values = byDay.get(date) ?? [];
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  const mean = series.length === 0 ? null : series.reduce((sum, value) => sum + value, 0) / series.length;
  return { start, end, days: series.length, mean, series };
}

export function bucketMeans(values: number[], buckets: number): number[] {
  if (values.length === 0 || buckets <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const start = Math.floor((i * values.length) / buckets);
    const end = Math.floor(((i + 1) * values.length) / buckets);
    const slice = values.slice(start, Math.max(end, start + 1));
    out.push(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  }
  return out;
}

export function confoundersForWindow(
  samples: SampleInput[],
  tags: TagInput[],
  startDate: string,
): ConfounderSummary {
  const sleep = compareMetric(samples, 'deep_sleep_min', startDate);
  const energy = compareMetric(samples, 'active_energy_kcal', startDate);
  const alcoholDays = countTags(tags, 'alcohol', sleep.after.start, sleep.after.end);
  const travelDays = countTags(tags, 'travel', sleep.after.start, sleep.after.end);
  const hardTrainingDays = countTags(tags, 'hard_training', sleep.after.start, sleep.after.end);
  let trainingLoadSimilar: boolean | null = null;
  if (energy.baseline.mean != null && energy.after.mean != null && energy.baseline.mean > 0) {
    trainingLoadSimilar = Math.abs(energy.after.mean - energy.baseline.mean) / energy.baseline.mean <= 0.1;
  }
  const heavy = sleep.after.days > 0 && (alcoholDays / sleep.after.days > HEAVY_ALCOHOL_RATIO || travelDays >= 7);
  return { trainingLoadSimilar, alcoholDays, travelDays, hardTrainingDays, heavy };
}

function countTags(tags: TagInput[], kind: TagInput['kind'], start: string, end: string): number {
  const dates = new Set(tags.filter((tag) => tag.kind === kind && tag.date >= start && tag.date <= end).map((tag) => tag.date));
  return dates.size;
}

export type Signal = 'strong' | 'weak' | 'flat' | 'insufficient';

export function signalStrength(input: {
  daysBaseline: number;
  daysAfter: number;
  deepSleepDelta: number | null;
  hrvDelta: number | null;
  rhrDelta: number | null;
}): Signal {
  if (input.daysBaseline < 14 || input.daysAfter < 14) return 'insufficient';
  const strong =
    (input.deepSleepDelta != null && input.deepSleepDelta >= STRONG_SLEEP_MIN) ||
    (input.hrvDelta != null && input.hrvDelta >= STRONG_HRV_MS) ||
    (input.rhrDelta != null && input.rhrDelta <= STRONG_RHR_BPM);
  if (strong) return 'strong';
  const weak =
    (input.deepSleepDelta != null && input.deepSleepDelta >= WEAK_SLEEP_MIN) ||
    (input.hrvDelta != null && input.hrvDelta >= WEAK_HRV_MS) ||
    (input.rhrDelta != null && input.rhrDelta <= WEAK_RHR_BPM);
  if (weak) return 'weak';
  return 'flat';
}

/**
 * Educational label for the monthly report. It is not a recommendation to
 * start or stop a supplement. "Drop" means the logged spend looks duplicative
 * and the wearable windows did not move.
 */
export function verdictFor(input: {
  signal: Signal;
  wastedCents: number;
  confounderHeavy: boolean;
}): Verdict {
  if (input.signal === 'insufficient' || input.signal === 'weak') return 'unclear';
  if (input.signal === 'strong') return input.confounderHeavy ? 'unclear' : 'keep';
  if (input.wastedCents >= DROP_WASTE_CENTS) return 'drop';
  return 'unclear';
}

export function associationSentence(productName: string, deepSleepDelta: number | null): string {
  if (deepSleepDelta != null && deepSleepDelta >= STRONG_SLEEP_MIN) {
    return `Deep sleep was higher in the 21 days after you started ${productName} than in the 21 days before. Association only — not proof of causation.`;
  }
  if (deepSleepDelta != null && deepSleepDelta <= -STRONG_SLEEP_MIN) {
    return `Deep sleep was lower in the 21 days after you started ${productName} than in the 21 days before. Association only — not proof of causation.`;
  }
  return `Deep sleep showed no clear difference after you started ${productName} compared with the 21 days before. Association only — not proof of causation.`;
}
