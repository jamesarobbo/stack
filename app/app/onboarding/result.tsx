import { router } from 'expo-router';
import { View } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { ScoreHero } from '@/src/components/share';
import { Button, Card, T } from '@/src/components/ui';
import { scoreProducts } from '@/src/domain/auditScore';
import { EXPECTATION } from '@/src/onboarding/answers';
import { readGoals, readSpend, readWearable } from '@/src/onboarding/storage';
import { buildOnboardingPreview } from '@/src/onboarding/preview';
import { useApp } from '@/src/state';
import { useTheme } from '@/src/theme';

export default function ResultStep() {
  const theme = useTheme();
  const app = useApp();
  const preview = buildOnboardingPreview(app.products, readGoals(), readSpend(), readWearable());
  const scored = scoreProducts(app.products);

  return (
    <OnboardingFrame step="result" footer={<Button label="See my full audit" onPress={() => router.push('/onboarding/save')} />}>
      <T weight="semibold" size={32} style={{ letterSpacing: -0.8 }}>
        {preview.headline}
      </T>
      <T size={15} weight="semibold" color={theme.action}>
        {preview.goalLine}
      </T>
      <T size={16} color={theme.muted}>
        {preview.because}
      </T>
      {preview.empty ? (
        <Card>
          <T size={15}>
            Add a product and Stack will look for duplicate ingredients, overlapping bottles, and doses near common upper limits.
          </T>
        </Card>
      ) : (
        <ScoreHero score={scored.score} summary={scored.summary} reasons={scored.reasons} />
      )}
      {preview.wastedLabel ? (
        <Card style={{ backgroundColor: theme.amberBg, borderColor: theme.amberBorder }}>
          <T size={13} color={theme.amber}>
            Estimated overlap
          </T>
          <T weight="semibold" size={32} color={theme.amber}>
            {preview.wastedLabel}
          </T>
          {preview.duplicateDetail.map((line) => (
            <T key={line} size={14}>
              {line}
            </T>
          ))}
        </Card>
      ) : null}
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
