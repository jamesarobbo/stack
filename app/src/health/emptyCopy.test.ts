import { describe, expect, it } from 'vitest';
import { healthConnectFailureCopy, wearableEmptyCopy } from './emptyCopy';

describe('wearable empty copy', () => {
  it('says Expo Go has no HealthKit and does not invent days', () => {
    const copy = wearableEmptyCopy({ expoGo: true, platform: 'ios' });
    expect(copy).toContain('Expo Go');
    expect(copy).toContain('does not invent');
    expect(copy.toLowerCase()).not.toContain('sample data stays');
  });

  it('does not promise sample series on web or Android', () => {
    expect(wearableEmptyCopy({ expoGo: false, platform: 'web' })).toContain('does not fill in sample');
    expect(healthConnectFailureCopy({ expoGo: false, platform: 'android' })).toContain('needs an iPhone');
    expect(healthConnectFailureCopy({ expoGo: false, platform: 'ios', detail: 'HealthKit could not be read.' })).toContain(
      'does not fill in wearable days',
    );
  });
});
