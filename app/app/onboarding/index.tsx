import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WindowArt } from '@/src/components/illustrations';
import { OnboardingProgress } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { theme } from '@/src/theme';

export default function WelcomeStep() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <WindowArt />
      <View
        style={{
          flex: 1,
          marginTop: -28,
          backgroundColor: theme.bg,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 24,
          paddingTop: 22,
          paddingBottom: Math.max(insets.bottom, 16),
          gap: 10,
        }}
      >
        <OnboardingProgress step="welcome" />
        <T weight="bold" size={34} style={{ letterSpacing: -0.7 }}>
          Set the bottles on the table.
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
