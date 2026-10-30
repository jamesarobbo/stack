import type { HealthConnection } from './types';

export type { HealthConnection };

/** Android, web, and any build without HealthKit. Sample rows stay on device. */
export async function connectAppleHealth(): Promise<HealthConnection> {
  return {
    mode: 'example',
    message:
      'Apple Health needs an iPhone development build. This install keeps using sample sleep, HRV, resting heart rate, VO2 max, steps, and active energy.',
  };
}
