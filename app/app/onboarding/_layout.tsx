import { Stack } from 'expo-router';
import { theme } from '@/src/theme';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="supplements" />
    </Stack>
  );
}
