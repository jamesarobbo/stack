import { BackButton, Card, Disclaimer, Screen, T } from '@/src/components/ui';
import { APP_NAME } from '@/src/config';
import { theme } from '@/src/theme';

export default function PrivacyScreen() {
  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={32} style={{ letterSpacing: -0.6 }}>
        Privacy
      </T>
      <T size={15} color={theme.muted}>
        {`${APP_NAME} is a general wellness and education log for adults in the US. It is not a medical device and it does not provide medical advice.`}
      </T>
      <Card>
        <T weight="semibold">What stays on this device</T>
        <T size={14} color={theme.muted}>
          Sleep, heart rate variability, resting heart rate, VO2 max, steps, and active energy stay on the phone unless you export them yourself. They are not sent when you sign in.
        </T>
      </Card>
      <Card>
        <T weight="semibold">What an account stores</T>
        <T size={14} color={theme.muted}>
          After you sign in, the supplement list you entered can sync: names, label amounts, price, servings, and start dates. You can delete that account from Settings. Deleting local data is separate and clears this device.
        </T>
      </Card>
      <Card>
        <T weight="semibold">What we do not do</T>
        <T size={14} color={theme.muted}>
          No disease claims, no dose calculator, and no sale of health data. Analytics and crash reporting stay off unless their keys are set, and they are not given wearable samples.
        </T>
      </Card>
      <Disclaimer />
    </Screen>
  );
}
