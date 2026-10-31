import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { HISTORY_DAYS } from '../../../shared/outcome';
import type { HealthMetric, SampleInput } from '../domain/types';
import { dayKey, deepSleepByDay, deviceLabel, statisticsRows } from './aggregate';
import { healthConnectFailureCopy, type WearablePlatform } from './emptyCopy';
import type { HealthConnection, HealthDemographics } from './types';

export type { HealthDemographics };

function wearablePlatform(): WearablePlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') return Platform.OS;
  return 'other';
}

/** Everything Stack reads, requested in one permission sheet. */
const READ_TYPES = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKCharacteristicTypeIdentifierDateOfBirth',
  'HKCharacteristicTypeIdentifierBiologicalSex',
] as const;

const QUANTITIES: { id: string; unit: string; metric: HealthMetric; statistic: 'cumulativeSum' | 'discreteAverage' }[] = [
  { id: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', unit: 'ms', metric: 'hrv_sdnn_ms', statistic: 'discreteAverage' },
  { id: 'HKQuantityTypeIdentifierRestingHeartRate', unit: 'count/min', metric: 'resting_hr_bpm', statistic: 'discreteAverage' },
  { id: 'HKQuantityTypeIdentifierVO2Max', unit: 'ml/(kg*min)', metric: 'vo2_max', statistic: 'discreteAverage' },
  { id: 'HKQuantityTypeIdentifierStepCount', unit: 'count', metric: 'steps', statistic: 'cumulativeSum' },
  { id: 'HKQuantityTypeIdentifierActiveEnergyBurned', unit: 'kcal', metric: 'active_energy_kcal', statistic: 'cumulativeSum' },
];

type Quantity = { quantity: number; unit: string };
type SourceRevision = { source?: { name?: string; bundleIdentifier?: string }; productType?: string };

type HealthkitModule = {
  isHealthDataAvailableAsync: () => Promise<boolean>;
  requestAuthorization: (options: { toRead: readonly string[] }) => Promise<boolean>;
  queryCategorySamples: (
    id: string,
    options: { limit: number; filter?: { date?: { startDate?: Date; endDate?: Date } } },
  ) => Promise<readonly { value: number; startDate: Date; endDate: Date; sourceRevision?: SourceRevision }[]>;
  queryQuantitySamples: (
    id: string,
    options: { limit: number; ascending?: boolean; unit?: string },
  ) => Promise<readonly { quantity: number; device?: { model?: string; name?: string }; sourceRevision?: SourceRevision }[]>;
  queryStatisticsCollectionForQuantity: (
    id: string,
    statistics: readonly ('cumulativeSum' | 'discreteAverage')[],
    anchorDate: Date,
    interval: { day: number },
    options: { filter?: { date?: { startDate?: Date; endDate?: Date } }; unit?: string },
  ) => Promise<readonly { startDate?: Date; sumQuantity?: Quantity; averageQuantity?: Quantity }[]>;
  getDateOfBirthAsync: () => Promise<Date | undefined | null>;
  getBiologicalSexAsync: () => Promise<number>;
};

function loadModule(): HealthkitModule {
  return require('@kingstinct/react-native-healthkit') as HealthkitModule;
}

/**
 * Asks once for every type, then reads HISTORY_DAYS of daily values on the device.
 * Nothing read here is sent to the server. Shared results send only the derived headline.
 */
export async function connectAppleHealth(): Promise<HealthConnection> {
  if (Constants.executionEnvironment === 'storeClient') {
    return { mode: 'unavailable', message: healthConnectFailureCopy({ expoGo: true, platform: wearablePlatform() }) };
  }
  try {
    const Healthkit = loadModule();
    if (!(await Healthkit.isHealthDataAvailableAsync())) {
      return { mode: 'unavailable', message: healthConnectFailureCopy({ expoGo: false, platform: 'ios' }) };
    }
    await Healthkit.requestAuthorization({ toRead: READ_TYPES });
    return await readAppleHealth(Healthkit);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'HealthKit could not be read.';
    return { mode: 'unavailable', message: healthConnectFailureCopy({ expoGo: false, platform: 'ios', detail }) };
  }
}

/** Silent re-read after the person has already answered the permission sheet. */
export async function refreshAppleHealth(): Promise<HealthConnection | null> {
  if (Constants.executionEnvironment === 'storeClient') return null;
  try {
    const Healthkit = loadModule();
    if (!(await Healthkit.isHealthDataAvailableAsync())) return null;
    return await readAppleHealth(Healthkit);
  } catch {
    return null;
  }
}

async function readAppleHealth(Healthkit: HealthkitModule): Promise<HealthConnection> {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - HISTORY_DAYS);
  const filter = { date: { startDate: start, endDate: end } };

  const sleep = await Healthkit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit: 0, filter });
  const samples: SampleInput[] = deepSleepByDay(
    sleep.map((sample) => ({
      value: sample.value,
      startDate: sample.startDate,
      endDate: sample.endDate,
      sourceId: sample.sourceRevision?.source?.bundleIdentifier ?? 'unknown',
    })),
  );

  for (const quantity of QUANTITIES) {
    const rows = await Healthkit.queryStatisticsCollectionForQuantity(quantity.id, [quantity.statistic], start, { day: 1 }, {
      filter,
      unit: quantity.unit,
    }).catch(() => []);
    samples.push(
      ...statisticsRows(
        quantity.metric,
        rows.map((row) => ({
          startDate: row.startDate,
          value: quantity.statistic === 'cumulativeSum' ? row.sumQuantity?.quantity : row.averageQuantity?.quantity,
        })),
      ),
    );
  }

  const latest = await Healthkit.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', { limit: 1, ascending: false }).catch(() => []);
  const sample = latest[0];
  const device = deviceLabel({
    model: sample?.device?.model ?? null,
    productType: sample?.sourceRevision?.productType ?? null,
    sourceName: sample?.sourceRevision?.source?.name ?? null,
  });

  return {
    mode: 'healthkit',
    message: `Apple Health is connected. Stack read ${HISTORY_DAYS} days of sleep, HRV, resting heart rate, VO2 max, steps, and active energy. That data stays on this device.`,
    samples,
    device,
    demographics: await readDemographics(Healthkit),
  };
}

async function readDemographics(Healthkit: HealthkitModule): Promise<HealthDemographics> {
  try {
    const birth = await Healthkit.getDateOfBirthAsync();
    const sexValue = await Healthkit.getBiologicalSexAsync();
    const sex = sexValue === 1 ? 'female' : sexValue === 2 ? 'male' : sexValue === 3 ? 'other' : 'notSet';
    return { birthDate: birth ? dayKey(birth) : null, sex };
  } catch {
    return { birthDate: null, sex: null };
  }
}
