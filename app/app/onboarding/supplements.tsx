import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, Pill, T } from '@/src/components/ui';
import { goalEcho } from '@/src/onboarding/answers';
import { readGoals } from '@/src/onboarding/storage';
import { SUPPLEMENT_ENTRY } from '@/src/onboarding/steps';
import { useApp } from '@/src/state';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '@/src/theme';

const ICONS = {
  search: 'search-outline',
  scan: 'barcode-outline',
  manual: 'create-outline',
} as const;

export default function SupplementStep() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const echo = goalEcho(readGoals());
  const shown = app.products.slice(0, 6);
  const extra = Math.max(0, app.products.length - shown.length);

  return (
    <OnboardingFrame
      step="supplements"
      footer={
        <Button
          label={app.products.length > 0 ? `Audit ${app.products.length} products` : 'Audit this stack'}
          onPress={() => router.push('/onboarding/auditing')}
        />
      }
    >
      <T weight="bold" size={32} style={styles.title}>
        Add your supplements
      </T>
      <T size={15} weight="semibold" color={theme.teal}>
        {echo}
      </T>
      <T size={16} color={theme.muted}>
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
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        ))}
      </View>
      {app.products.length > 0 ? (
        <>
          <T weight="semibold" size={17}>
            In your stack
          </T>
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
        <T size={14} color={theme.muted}>
          Nothing added yet. You can also do this later from My stack.
        </T>
      )}
    </OnboardingFrame>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.8 },
  list: { gap: space.md },
  row: {
    minHeight: control.listRow + space.md,
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: theme.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
}

