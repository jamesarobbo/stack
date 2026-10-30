export type WearablePlatform = 'ios' | 'android' | 'web' | 'other';

export function wearableEmptyCopy(input: { expoGo: boolean; platform: WearablePlatform }): string {
  if (input.expoGo) {
    return 'HealthKit is not available in Expo Go, so there are no wearable days here. A development build can read Apple Health. This preview does not invent sleep, heart rate, or steps.';
  }
  if (input.platform === 'ios') {
    return 'No wearable days on this iPhone yet. Connect Apple Health in a development build. Impact and the monthly report need a few weeks of sleep, HRV, and resting heart rate.';
  }
  return 'No wearable days on this device. Apple Health is read on iPhone. This install does not fill in sample sleep, heart rate, or steps.';
}

export function healthConnectFailureCopy(input: { expoGo: boolean; platform: WearablePlatform; detail?: string }): string {
  if (input.detail) return `${input.detail} Stack does not fill in wearable days.`;
  if (input.expoGo) return wearableEmptyCopy(input);
  if (input.platform === 'ios') {
    return 'Apple Health is not available on this iPhone. Stack does not fill in wearable days.';
  }
  return 'Apple Health needs an iPhone. This install does not fill in wearable days.';
}
