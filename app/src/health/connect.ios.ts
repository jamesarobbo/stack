import Constants from 'expo-constants';
import type { HealthMetric, SampleInput } from '../domain/types';
import type { HealthConnection } from './types';

const READ_TYPES = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
] as const;

const ASLEEP_DEEP = 4;

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type Bucket = Map<string, { sum: number; count: number }>;

function add(bucket: Bucket, date: string, value: number) {
  const current = bucket.get(date) ?? { sum: 0, count: 0 };
  current.sum += value;
  current.count += 1;
  bucket.set(date, current);
}

function rowsFrom(bucket: Bucket, metric: HealthMetric, mode: 'sum' | 'avg'): SampleInput[] {
  return [...bucket.entries()].map(([date, value]) => ({
    metric,
    date,
    value: mode === 'sum' ? value.sum : value.sum / value.count,
  }));
}

export async function connectAppleHealth(): Promise<HealthConnection> {
  if (Constants.executionEnvironment === 'storeClient') {
    return {
      mode: 'example',
      message:
        'Expo Go cannot read HealthKit. Sample data stays on this device. A development build reads Apple Health.',
    };
  }

  try {
    const Healthkit = require('@kingstinct/react-native-healthkit') as {
      isHealthDataAvailableAsync: () => Promise<boolean>;
      requestAuthorization: (options: { toRead: readonly string[] }) => Promise<boolean>;
      queryCategorySamples: (
        id: string,
        options: { limit: number; filter?: { date?: { startDate?: Date; endDate?: Date } } },
      ) => Promise<{ value: number; startDate: Date; endDate: Date }[]>;
      queryQuantitySamples: (
        id: string,
        options: { limit: number; unit?: string; filter?: { date?: { startDate?: Date; endDate?: Date } } },
      ) => Promise<{ quantity: number; startDate: Date; endDate: Date }[]>;
    };

    const available = await Healthkit.isHealthDataAvailableAsync();
    if (!available) {
      return {
        mode: 'example',
        message: 'Apple Health is not available here. Sample data stays on this device.',
      };
    }

    await Healthkit.requestAuthorization({ toRead: READ_TYPES });
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 120);
    const filter = { date: { startDate: start, endDate: end } };

    const sleep = await Healthkit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit: 0, filter });
    const sleepBucket: Bucket = new Map();
    for (const sample of sleep) {
      if (sample.value !== ASLEEP_DEEP) continue;
      const minutes = Math.max(0, (sample.endDate.getTime() - sample.startDate.getTime()) / 60_000);
      add(sleepBucket, dayKey(sample.endDate), minutes);
    }

    const quantities: { id: string; unit: string; metric: HealthMetric; mode: 'sum' | 'avg' }[] = [
      { id: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', unit: 'ms', metric: 'hrv_sdnn_ms', mode: 'avg' },
      { id: 'HKQuantityTypeIdentifierRestingHeartRate', unit: 'count/min', metric: 'resting_hr_bpm', mode: 'avg' },
      { id: 'HKQuantityTypeIdentifierVO2Max', unit: 'ml/(kg*min)', metric: 'vo2_max', mode: 'avg' },
      { id: 'HKQuantityTypeIdentifierStepCount', unit: 'count', metric: 'steps', mode: 'sum' },
      { id: 'HKQuantityTypeIdentifierActiveEnergyBurned', unit: 'kcal', metric: 'active_energy_kcal', mode: 'sum' },
    ];

    const samples: SampleInput[] = rowsFrom(sleepBucket, 'deep_sleep_min', 'sum');
    for (const quantity of quantities) {
      const queried = await Healthkit.queryQuantitySamples(quantity.id, { limit: 0, unit: quantity.unit, filter });
      const bucket: Bucket = new Map();
      for (const sample of queried) add(bucket, dayKey(sample.startDate), sample.quantity);
      samples.push(...rowsFrom(bucket, quantity.metric, quantity.mode));
    }

    return {
      mode: 'healthkit',
      message:
        'Apple Health is connected for sleep, HRV, resting heart rate, VO2 max, steps, and active energy. Those samples stay on this device.',
      samples,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'HealthKit could not be read.';
    return {
      mode: 'example',
      message: `${detail} Sample data stays on this device.`,
    };
  }
}
