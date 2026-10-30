import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Choice, OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { syncProfile } from '@/src/data/profile';
import { localToday } from '@/src/dates';
import { AGE_RANGES, SEXES, ageRangeFromBirthDate, isAgeRange, isSex, prefillSex, type AgeRange, type Sex } from '@/src/health/demographics';
import { getSetting, setSetting } from '@/src/settings';
import { track } from '@/src/telemetry';
import { theme } from '@/src/theme';

export default function AboutStep() {
  const [age, setAge] = useState<AgeRange | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);

  useEffect(() => {
    const savedAge = getSetting('ageRange');
    const savedSex = getSetting('sex');
    if (isAgeRange(savedAge)) setAge(savedAge);
    if (isSex(savedSex)) setSex(savedSex);
    if (savedAge || savedSex) return;
    // Read with the single Apple Health permission sheet on the wearable step. Stays on this device.
    const birthDate = getSetting('healthBirthDate');
    const range = birthDate ? ageRangeFromBirthDate(birthDate, localToday()) : null;
    const filledSex = prefillSex(getSetting('healthSex'));
    if (range) setAge(range);
    if (filledSex) setSex(filledSex);
  }, []);

  return (
    <OnboardingFrame
      step="about"
      footer={<Button label="Continue" disabled={age == null || sex == null} onPress={() => void go(age, sex)} />}
    >
      <T weight="bold" size={30} style={{ letterSpacing: -0.6 }}>
        About you
      </T>
      <T size={15} color={theme.muted}>
        Used for Discover's people like you and for grouped results. Never shown on your shared page.
      </T>
      <T weight="semibold">Age range</T>
      <View style={{ gap: 10 }}>
        {AGE_RANGES.map((option) => (
          <Choice key={option.key} label={option.label} selected={age === option.key} onPress={() => setAge(option.key)} />
        ))}
      </View>
      <T weight="semibold">Sex</T>
      <View style={{ gap: 10 }}>
        {SEXES.map((option) => (
          <Choice key={option.key} label={option.label} selected={sex === option.key} onPress={() => setSex(option.key)} />
        ))}
      </View>
    </OnboardingFrame>
  );
}

async function go(age: AgeRange | null, sex: Sex | null) {
  if (!age || !sex) return;
  await setSetting('ageRange', age);
  await setSetting('sex', sex);
  track('onboarding_answer', { step: 'about' });
  await syncProfile(getSetting('sessionToken')).catch(() => undefined);
  router.push('/onboarding/supplements');
}
