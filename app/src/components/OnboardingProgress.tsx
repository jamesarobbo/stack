import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { previousOnboardingStep, onboardingProgress, type OnboardingStepKey } from '@/src/onboarding/steps';
import { track } from '@/src/telemetry';
import { useTheme, useThemedStyles, type Theme } from '@/src/theme';
import { Screen, T } from './ui';

export function OnboardingProgress({ step }: { step: OnboardingStepKey }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const progress = onboardingProgress(step);
  useEffect(() => {
    track('onboarding_step', { step, index: onboardingProgress(step).current });
  }, [step]);
  return (
    <View accessibilityLabel={progress.label} accessibilityRole="text" style={styles.wrap}>
      <T size={13} weight="semibold" color={theme.muted}>
        {progress.label}
      </T>
      <View style={styles.track}>
        {Array.from({ length: progress.total }, (_, index) => (
          <View key={index} style={[styles.segment, index < progress.filled ? styles.filled : styles.empty]} />
        ))}
      </View>
    </View>
  );
}

export function OnboardingFrame({
  step,
  children,
  footer,
}: {
  step: OnboardingStepKey;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const previous = previousOnboardingStep(step);
  return (
    <Screen footer={footer}>
      <OnboardingProgress step={step} />
      {previous ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace(previous.path);
          }}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={18} color={theme.teal} />
          <T size={15} weight="medium" color={theme.teal}>
            Back
          </T>
        </Pressable>
      ) : null}
      {children}
    </Screen>
  );
}

export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected ? styles.choiceOn : null]}
    >
      <T weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.teal} /> : null}
    </Pressable>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  wrap: { gap: 8 },
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 999 },
  filled: { backgroundColor: theme.teal },
  empty: { backgroundColor: theme.line },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  choice: {
    minHeight: 56,
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceOn: { borderColor: theme.teal, backgroundColor: theme.tealSoft },
});
}

