import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Choice, OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { getCurrency } from '@/src/money';
import { spendChoices, type SpendKey } from '@/src/onboarding/answers';
import { readSpend, writeSpend } from '@/src/onboarding/storage';
import { track } from '@/src/telemetry';
import { useTheme } from '@/src/theme';

export default function SpendStep() {
  const theme = useTheme();
  const [selected, setSelected] = useState<SpendKey | null>(() => readSpend());

  return (
    <OnboardingFrame
      step="spend"
      footer={<Button label="Use this spend" disabled={selected == null} onPress={() => void go(selected)} />}
    >
      <T weight="bold" size={32} style={{ letterSpacing: -0.8 }}>
        Rough monthly supplement spend
      </T>
      <T size={15} color={theme.muted}>
        Most people underestimate this, and that is fine.
      </T>
      <View style={{ gap: 10 }}>
        {spendChoices(getCurrency()).map((option) => (
          <Choice key={option.key} label={option.label} selected={selected === option.key} onPress={() => setSelected(option.key)} />
        ))}
      </View>
    </OnboardingFrame>
  );
}

async function go(selected: SpendKey | null) {
  if (!selected) return;
  await writeSpend(selected);
  track('onboarding_answer', { step: 'spend', value: selected });
  router.push('/onboarding/wearable');
}
