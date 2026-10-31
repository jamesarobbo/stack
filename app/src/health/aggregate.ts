import type { HealthMetric, SampleInput } from '../domain/types';

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type SleepSample = { value: number; startDate: Date; endDate: Date; sourceId: string };

const ASLEEP_DEEP = 4;

/**
 * Deep sleep minutes per night. When a phone, a watch, and a ring all record the same night,
 * the night uses the one source with the most deep sleep rather than adding them together.
 */
export function deepSleepByDay(samples: SleepSample[]): SampleInput[] {
  const nights = new Map<string, Map<string, number>>();
  for (const sample of samples) {
    if (sample.value !== ASLEEP_DEEP) continue;
    const minutes = Math.max(0, (sample.endDate.getTime() - sample.startDate.getTime()) / 60_000);
    if (minutes === 0) continue;
    const day = dayKey(sample.endDate);
    const bySource = nights.get(day) ?? new Map<string, number>();
    bySource.set(sample.sourceId, (bySource.get(sample.sourceId) ?? 0) + minutes);
    nights.set(day, bySource);
  }
  return [...nights.entries()]
    .map(([date, bySource]) => ({ metric: 'deep_sleep_min' as const, date, value: Math.round(Math.max(...bySource.values())) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type DailyStatistic = { startDate?: Date; value?: number };

/** One row per day from a statistics collection. HealthKit merges sources, so steps are not double counted. */
export function statisticsRows(metric: HealthMetric, rows: readonly DailyStatistic[]): SampleInput[] {
  const out: SampleInput[] = [];
  for (const row of rows) {
    if (!row.startDate || row.value == null || !Number.isFinite(row.value) || row.value <= 0) continue;
    out.push({ metric, date: dayKey(row.startDate), value: Math.round(row.value * 100) / 100 });
  }
  return out;
}

const KNOWN_MAKERS = ['Oura', 'Whoop', 'Garmin', 'Fitbit', 'Withings', 'Polar', 'Coros', 'Suunto', 'Eight Sleep'];

/**
 * A public device label. Source names often contain the owner's name ("Sam's Apple Watch"),
 * so the label comes from the model or a known maker, never from the source name itself.
 */
export function deviceLabel(input: { model?: string | null; productType?: string | null; sourceName?: string | null }): string {
  const model = (input.model ?? '').toLowerCase();
  const product = (input.productType ?? '').toLowerCase();
  if (model.includes('watch') || product.startsWith('watch')) return 'Apple Watch';
  if (model.includes('iphone') || product.startsWith('iphone')) return 'iPhone';
  const source = input.sourceName ?? '';
  const maker = KNOWN_MAKERS.find((name) => source.toLowerCase().includes(name.toLowerCase()));
  return maker ?? 'Apple Health';
}
