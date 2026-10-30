import { StyleSheet, View } from 'react-native';
import { ONBOARDING_STEPS, onboardingProgress, type OnboardingStepKey } from '@/src/onboarding/steps';
import { theme } from '@/src/theme';
import { T } from './ui';

export function OnboardingProgress({ step }: { step: OnboardingStepKey }) {
  const progress = onboardingProgress(step);
  return (
    <View accessibilityLabel={progress.label} accessibilityRole="text" style={styles.wrap}>
      <T size={13} weight="semibold" color={theme.muted}>
        {progress.label}
      </T>
      <View style={styles.track}>
        {ONBOARDING_STEPS.map((item, index) => (
          <View key={item.key} style={[styles.segment, index < progress.filled ? styles.filled : styles.empty]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 999 },
  filled: { backgroundColor: theme.teal },
  empty: { backgroundColor: '#E4E7EC' },
});
