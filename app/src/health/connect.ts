import { healthConnectFailureCopy } from './emptyCopy';
import type { HealthConnection } from './types';

export type { HealthConnection };

/** Android, web, and any build without the iOS HealthKit module. */
export async function connectAppleHealth(): Promise<HealthConnection> {
  return {
    mode: 'unavailable',
    message: healthConnectFailureCopy({ expoGo: false, platform: 'web' }),
  };
}

export type HealthDemographics = {
  birthDate: string | null;
  sex: 'female' | 'male' | 'other' | 'notSet' | null;
};

/** Expo Go, Android, and web have no HealthKit profile to prefill. */
export async function readHealthDemographics(): Promise<HealthDemographics> {
  return { birthDate: null, sex: null };
}
