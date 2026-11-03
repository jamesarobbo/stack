import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { EXPECTATION, type WearableChoice } from '@/src/onboarding/answers';
import { writeWearable } from '@/src/onboarding/storage';
import { track } from '@/src/telemetry';
import { useApp } from '@/src/state';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '@/src/theme';

const COMING = [
  { name: 'Oura', icon: 'ellipse-outline' as const },
  { name: 'WHOOP', icon: 'watch-outline' as const },
  { name: 'Garmin', icon: 'navigate-outline' as const },
];

export default function WearableStep() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const linked = app.healthSource === 'healthkit';
  const selected = linked || tried;

  async function go(choice: WearableChoice) {
    await writeWearable(choice);
    track('onboarding_answer', { step: 'wearable', value: choice });
    router.push('/onboarding/about');
  }

  return (
    <OnboardingFrame
      step="wearable"
      footer={
        <View style={{ gap: space.sm }}>
          <Button label="Continue" onPress={() => void go(linked ? 'healthkit' : tried ? 'sample' : 'skipped')} />
          <Button label="Skip for now" kind="secondary" onPress={() => void go('skipped')} />
        </View>
      }
    >
      <T weight="semibold" size={32} style={styles.title}>
        Choose a wearable
      </T>
      <T size={15} color={theme.muted}>
        This is how Stack shows whether each supplement is doing anything for you. You can skip this.
      </T>
      <T size={15} color={theme.muted}>
        {EXPECTATION}
      </T>
      <View style={styles.grid}>
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            setTried(true);
            setMessage(await app.connectWearable());
          }}
          style={[styles.wearable, selected ? styles.wearableOn : null]}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={theme.action} />
          <T weight="semibold">Apple Health</T>
          <T size={12} color={selected ? theme.action : theme.muted}>
            {linked ? 'Connected' : tried ? 'Not connected' : 'Tap to connect'}
          </T>
        </Pressable>
        {COMING.map((item) => (
          <Pressable
            key={item.name}
            accessibilityRole="button"
            onPress={() => setMessage(`${item.name} is coming soon. Apple Health is available in this version.`)}
            style={styles.wearable}
          >
            <Ionicons name={item.icon} size={18} color={theme.muted} />
            <T weight="semibold" color={theme.muted}>
              {item.name}
            </T>
            <T size={13} color={theme.muted}>
              Coming soon
            </T>
          </Pressable>
        ))}
      </View>
      {message ? (
        <T size={13} color={theme.muted}>
          {message}
        </T>
      ) : null}
    </OnboardingFrame>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  wearable: {
    width: '48%',
    minHeight: control.listRow + control.height,
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: space.md,
    gap: space.xs,
  },
  wearableOn: { borderColor: theme.action, backgroundColor: theme.sand },
});
}

