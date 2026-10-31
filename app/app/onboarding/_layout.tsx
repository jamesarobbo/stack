import { Stack } from 'expo-router';
import { useTheme } from '@/src/theme';

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="goal" />
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
