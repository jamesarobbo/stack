import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OnboardingProgress } from '@/src/components/OnboardingProgress';
import { Button, Screen, T } from '@/src/components/ui';
import { APP_NAME, APP_TAGLINE } from '@/src/config';
import { ONBOARDING_STEPS } from '@/src/onboarding/steps';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

const COMING = [
  { name: 'Oura', icon: 'ellipse-outline' as const },
  { name: 'WHOOP', icon: 'watch-outline' as const },
  { name: 'Garmin', icon: 'navigate-outline' as const },
];

export default function WearableStep() {
  const app = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const linked = app.healthSource === 'healthkit';
  const selected = linked || tried;
  const next = ONBOARDING_STEPS.find((step) => step.key === 'supplements');

  function goNext() {
    if (!next) return;
    router.push(next.path);
  }

  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button label="Continue" onPress={goNext} />
          <Button label="Skip for now" tone="ghost" onPress={goNext} />
        </View>
      }
    >
      <OnboardingProgress step="wearable" />
      <T weight="bold" size={22}>
        {APP_NAME}
      </T>
      <T size={14} color={theme.muted} style={{ marginTop: -8 }}>
        {APP_TAGLINE}
      </T>
      <T weight="bold" size={30} style={styles.title}>
        Choose a wearable
      </T>
      <T size={15} color={theme.muted}>
        Link Apple Health so later screens can compare the days before a start date with the days after. You can skip this.
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
          <Ionicons name="phone-portrait-outline" size={18} color={theme.teal} />
          <T weight="semibold">Apple Health</T>
          <T size={12} color={selected ? theme.teal : theme.muted}>
            {linked ? 'Connected' : tried ? 'Sample data on this device' : 'Tap to connect'}
          </T>
        </Pressable>
        {COMING.map((item) => (
          <Pressable
            key={item.name}
            accessibilityRole="button"
            onPress={() => setMessage(`${item.name} is coming soon. Apple Health is available in this version.`)}
            style={styles.wearable}
          >
            <Ionicons name={item.icon} size={18} color={theme.faint} />
            <T weight="semibold" color={theme.muted}>
              {item.name}
            </T>
            <T size={12} color={theme.faint}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wearable: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    padding: 14,
    gap: 4,
  },
  wearableOn: { borderColor: theme.teal, backgroundColor: '#F3FBFA' },
});
