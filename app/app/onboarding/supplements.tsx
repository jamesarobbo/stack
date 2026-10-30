import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { OnboardingProgress } from '@/src/components/OnboardingProgress';
import { Button, Eyebrow, Pill, Screen, T } from '@/src/components/ui';
import { SUPPLEMENT_ENTRY } from '@/src/onboarding/steps';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

const ICONS = {
  search: 'search-outline',
  scan: 'barcode-outline',
  manual: 'create-outline',
} as const;

export default function SupplementStep() {
  const app = useApp();
  const shown = app.products.slice(0, 6);
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
      <OnboardingProgress step="supplements" />
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={theme.teal} />
        <T size={15} weight="medium" color={theme.teal}>
          Wearable
        </T>
      </Pressable>
      <T weight="bold" size={30} style={styles.title}>
        Add your supplements
      </T>
      <T size={15} color={theme.muted}>
        Search the NIH label database, scan a barcode, or type what the bottle says. You still enter the price and the start date.
      </T>
      <View style={styles.list}>
        {SUPPLEMENT_ENTRY.map((entry) => (
          <Pressable
            key={entry.key}
            accessibilityRole="button"
            onPress={() => {
              if (entry.mode) router.push({ pathname: entry.path, params: { mode: entry.mode } });
              else router.push(entry.path);
            }}
            style={styles.row}
          >
            <View style={styles.icon}>
              <Ionicons name={ICONS[entry.key]} size={18} color={theme.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="semibold">{entry.title}</T>
              <T size={13} color={theme.muted}>
                {entry.detail}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.faint} />
          </Pressable>
        ))}
      </View>
      {app.products.length > 0 ? (
        <>
          <Eyebrow left="In your stack" />
          <View style={styles.chips}>
            {shown.map((product) => (
              <Pill key={product.id} tone="teal">
                {product.name}
              </Pill>
            ))}
            {extra > 0 ? <Pill>{`+${extra} more`}</Pill> : null}
          </View>
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => app.restoreExample()}>
          <T weight="semibold" color={theme.teal}>
            Load the example stack
          </T>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6, marginTop: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  list: { gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
