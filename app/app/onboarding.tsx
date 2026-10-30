import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button, Eyebrow, Pill, Screen, T } from '@/src/components/ui';
import { APP_NAME, APP_TAGLINE } from '@/src/config';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

const COMING = [
  { name: 'Oura', icon: 'ellipse-outline' as const },
  { name: 'WHOOP', icon: 'watch-outline' as const },
  { name: 'Garmin', icon: 'navigate-outline' as const },
];

export default function OnboardingScreen() {
  const app = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const connected = app.healthSource === 'healthkit' || app.healthSource === 'example';
  const shown = app.products.slice(0, 3);
  const extra = Math.max(0, app.products.length - shown.length);

  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={app.products.length > 0 ? `Continue with ${app.products.length} products` : 'Continue'}
            onPress={async () => {
              await app.completeOnboarding();
              router.replace('/(tabs)/stack');
            }}
          />
          <T size={12} color={theme.muted} style={{ textAlign: 'center' }}>
            You can change this any time.
          </T>
        </View>
      }
    >
      <T weight="bold" size={22}>
        {APP_NAME}
      </T>
      <T size={14} color={theme.muted} style={{ marginTop: -8 }}>
        {APP_TAGLINE}
      </T>
      <T weight="bold" size={30} style={styles.title}>
        Connect wearables and build your stack
      </T>
      <T size={15} color={theme.muted}>
        Link a device for before/after comparisons. Add products by search or by typing the label.
      </T>

      <Eyebrow left="Wearables" />
      <View style={styles.grid}>
        <Pressable
          accessibilityRole="button"
          onPress={async () => setMessage(await app.connectWearable())}
          style={[styles.wearable, connected ? styles.wearableOn : null]}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={theme.teal} />
          <T weight="semibold">Apple Health</T>
          <T size={12} color={connected ? theme.teal : theme.muted}>
            {connected ? 'Connected' : 'Tap to connect'}
          </T>
        </Pressable>
        {COMING.map((item) => (
          <View key={item.name} style={styles.wearable}>
            <Ionicons name={item.icon} size={18} color={theme.faint} />
            <T weight="semibold" color={theme.muted}>
              {item.name}
            </T>
            <T size={12} color={theme.faint}>
              Coming soon
            </T>
          </View>
        ))}
      </View>
      {message ? (
        <T size={13} color={theme.muted}>
          {message}
        </T>
      ) : null}

      <Eyebrow left="Your stack" />
      <Pressable accessibilityRole="button" onPress={() => router.push('/add?mode=search')} style={styles.search}>
        <T color={theme.faint}>NMN, TMG, magnesium…</T>
        <T weight="semibold" color={theme.teal}>
          Search
        </T>
      </Pressable>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => Alert.alert('Label scan', 'Label scan is not in this version. Search or add the product by hand.')}>
          <Ionicons name="scan-outline" size={16} color={theme.text} />
          <T weight="medium" size={14}>
            Scan label
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => router.push('/add?mode=manual')}>
          <Ionicons name="create-outline" size={16} color={theme.text} />
          <T weight="medium" size={14}>
            Add manually
          </T>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {shown.map((product) => (
          <Pill key={product.id} tone="teal">
            {product.name.replace(' 1,000 mg', '').replace(' 500 mg', '').replace(' 4,000 IU', '')}
          </Pill>
        ))}
        {extra > 0 ? <Pill>{`+${extra} more`}</Pill> : null}
      </View>
      {app.products.length === 0 ? (
        <Pressable accessibilityRole="button" onPress={() => app.restoreExample()}>
          <T weight="semibold" color={theme.teal}>
            Load the example stack
          </T>
        </Pressable>
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
  search: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
