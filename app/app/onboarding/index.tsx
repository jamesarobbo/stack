import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingProgress } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { space, useTheme } from '@/src/theme';

export default function WelcomeStep() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          paddingHorizontal: space.xl,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 16),
          gap: space.md,
        }}
      >
        <OnboardingProgress step="welcome" />
        <T weight="bold" size={34} style={{ letterSpacing: -0.7 }}>
          Your stack, in one place.
        </T>
        <T size={16} color={theme.muted}>
          Add what you take. Stack checks the doses and shows what you pay each month.
        </T>
        <View style={{ flex: 1 }} />
        <Button label="Continue" onPress={() => router.push('/onboarding/goal')} />
      </View>
    </View>
  );
}
