import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { T } from '@/src/components/ui';
import { AUDIT_CHECKS } from '@/src/onboarding/preview';
import { theme } from '@/src/theme';

export default function AuditingStep() {
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
      <T weight="bold" size={30} style={{ letterSpacing: -0.6 }}>
        Auditing your stack
      </T>
      <T size={15} color={theme.muted}>
        Checking what you entered.
      </T>
      <View style={{ gap: 12 }}>
        {AUDIT_CHECKS.slice(0, shown).map((check) => (
          <T key={check} weight="semibold" size={16}>
            {check}
          </T>
        ))}
      </View>
    </OnboardingFrame>
  );
}
