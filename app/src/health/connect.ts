import { healthConnectFailureCopy } from './emptyCopy';
import type { HealthConnection, HealthDemographics } from './types';

export type { HealthConnection, HealthDemographics };

/** Android, web, and any build without the iOS HealthKit module. */
export async function connectAppleHealth(): Promise<HealthConnection> {
  return {
    mode: 'unavailable',
    message: healthConnectFailureCopy({ expoGo: false, platform: 'web' }),
  };
}

export async function refreshAppleHealth(): Promise<HealthConnection | null> {
  return null;
}
