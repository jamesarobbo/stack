import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Choice, OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { GOALS, toggleGoal } from '@/src/onboarding/answers';
import { readGoals, writeGoals } from '@/src/onboarding/storage';
import { track } from '@/src/telemetry';
import { theme } from '@/src/theme';

export default function GoalStep() {
  const [selected, setSelected] = useState<string[]>(() => readGoals());

  return (
    <OnboardingFrame
      step="goal"
      footer={<Button label="Use these goals" disabled={selected.length === 0} onPress={() => void go(selected)} />}
    >
      <T weight="bold" size={30} style={{ letterSpacing: -0.6 }}>
        What do you want your stack to do?
      </T>
      <T size={15} color={theme.muted}>
        Pick any that fit. Not sure yet is a fine answer.
      </T>
      <View style={{ gap: 10 }}>
        {GOALS.map((goal) => (
          <Choice key={goal.key} label={goal.label} selected={selected.includes(goal.key)} onPress={() => setSelected((current) => toggleGoal(current, goal.key))} />
        ))}
      </View>
    </OnboardingFrame>
  );
}

async function go(selected: string[]) {
  await writeGoals(selected);
  track('onboarding_answer', { step: 'goal', value: selected.join(',') });
  router.push('/onboarding/spend');
}
