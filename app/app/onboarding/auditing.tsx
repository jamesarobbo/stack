import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { T } from '@/src/components/ui';
import { AUDIT_CHECKS } from '@/src/onboarding/preview';
import { space, useTheme } from '@/src/theme';

export default function AuditingStep() {
  const theme = useTheme();
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const ticks = AUDIT_CHECKS.map((_, index) =>
      setTimeout(() => setShown(index + 1), 500 * index),
    );
    const advance = setTimeout(() => router.push('/onboarding/result'), 2600);
    return () => {
      ticks.forEach(clearTimeout);
      clearTimeout(advance);
    };
  }, []);

  return (
    <OnboardingFrame step="auditing">
      <T weight="bold" size={32} style={{ letterSpacing: -0.8 }}>
        Auditing your stack
      </T>
      <T size={16} color={theme.muted}>
        Checking what you entered.
      </T>
      <View style={{ gap: space.md }}>
        {AUDIT_CHECKS.slice(0, shown).map((check) => (
          <View key={check} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="checkmark-circle" size={22} color={theme.teal} />
            <T weight="semibold" size={16}>
              {check}
            </T>
          </View>
        ))}
      </View>
    </OnboardingFrame>
  );
}
