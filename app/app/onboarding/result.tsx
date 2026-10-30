import { router } from 'expo-router';
import { View } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, Card, T } from '@/src/components/ui';
import { EXPECTATION } from '@/src/onboarding/answers';
import { readGoals, readSpend, readWearable } from '@/src/onboarding/storage';
import { buildOnboardingPreview } from '@/src/onboarding/preview';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function ResultStep() {
  const app = useApp();
  const preview = buildOnboardingPreview(app.products, readGoals(), readSpend(), readWearable());

  return (
    <OnboardingFrame step="result" footer={<Button label="See my full audit" onPress={() => router.push('/onboarding/save')} />}>
      <T weight="semibold" size={15} color={theme.teal}>
        {preview.goalLine}
      </T>
      <T weight="bold" size={30} style={{ letterSpacing: -0.6 }}>
        {preview.headline}
      </T>
      <T size={15} color={theme.muted}>
        {preview.because}
      </T>
      {preview.empty ? (
        <Card>
          <T size={15}>
            Add a product and Stack will look for duplicate ingredients, overlapping bottles, and doses near common upper limits.
          </T>
        </Card>
      ) : null}
      {preview.clean ? (
        <Card>
          <T size={15}>No duplicate ingredients, and nothing in this stack is near a published upper limit.</T>
        </Card>
      ) : null}
      {preview.wastedLabel ? (
        <Card style={{ backgroundColor: theme.amberBg, borderColor: theme.amberBorder }}>
          <T size={13} color={theme.amber}>
            Estimated overlap
          </T>
          <T weight="bold" size={32} color={theme.amber}>
            {preview.wastedLabel}
          </T>
          {preview.duplicateDetail.map((line) => (
            <T key={line} size={14}>
              {line}
            </T>
          ))}
        </Card>
      ) : null}
      {preview.limitLines.map((line) => (
        <Card key={line}>
          <T size={14}>{line}</T>
        </Card>
      ))}
      {preview.spendLine ? (
        <T size={15} color={theme.muted}>
          {preview.spendLine}
        </T>
      ) : null}
      <T size={15} color={theme.muted}>
        {preview.wearableLine}
      </T>
      <View>
        <T size={15} color={theme.muted}>
          {EXPECTATION}
        </T>
      </View>
    </OnboardingFrame>
  );
}
