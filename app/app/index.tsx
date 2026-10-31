import { Redirect } from 'expo-router';
import { useApp } from '@/src/state';

export default function Index() {
  const app = useApp();
  if (!app.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/stack" />;
}
