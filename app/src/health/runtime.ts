import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { wearableEmptyCopy, type WearablePlatform } from './emptyCopy';

function platform(): WearablePlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') return Platform.OS;
  return 'other';
}

export function currentWearableEmptyCopy(): string {
  return wearableEmptyCopy({
    expoGo: Constants.executionEnvironment === 'storeClient',
    platform: platform(),
  });
}
