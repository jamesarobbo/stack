import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Choice, OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { SPEND_OPTIONS, type SpendKey } from '@/src/onboarding/answers';
import { readSpend, writeSpend } from '@/src/onboarding/storage';
import { track } from '@/src/telemetry';
import { theme } from '@/src/theme';

export default function SpendStep() {
  const [selected, setSelected] = useState<SpendKey | null>(() => readSpend());

  return (
    <OnboardingFrame
      step="spend"
      footer={<Button label="Use this spend" disabled={selected == null} onPress={() => void go(selected)} />}
    >
      <T weight="bold" size={30} style={{ letterSpacing: -0.6 }}>
        Rough monthly supplement spend
      </T>
      <T size={15} color={theme.muted}>
        Most people underestimate this, and that is fine.
      </T>
      <View style={{ gap: 10 }}>
        {SPEND_OPTIONS.map((option) => (
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
