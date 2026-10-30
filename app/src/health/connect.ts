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
