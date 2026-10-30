import { Stack } from 'expo-router';
import { theme } from '@/src/theme';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="spend" />
      <Stack.Screen name="wearable" />
      <Stack.Screen name="about" />
      <Stack.Screen name="supplements" />
      <Stack.Screen name="auditing" />
      <Stack.Screen name="result" />
      <Stack.Screen name="save" />
    </Stack>
  );
}
