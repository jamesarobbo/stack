import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { TodayList } from '@/src/components/TodayList';
import { BackButton, Card, Screen, T } from '@/src/components/ui';
import { localToday } from '@/src/dates';
import { useApp } from '@/src/state';
import { useTheme, useThemedStyles, type Theme } from '@/src/theme';

/** Check-in for the device's local today only. History lives on its own screen. */
export default function TodayScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const today = localToday();

  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={30} style={styles.title}>
        Today
      </T>
      <Card>
        <TodayList
          products={app.products}
          logs={app.logs}
          onToggle={(productId, _day, taken) => void app.toggleTaken(productId, today, taken)}
          onAllTaken={() => void app.markAllTaken(today)}
        />
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="History"
        onPress={() => router.push('/history')}
        style={({ pressed }) => [styles.historyRow, pressed ? { opacity: 0.88 } : null]}
      >
        <T size={15} weight="medium" color={theme.muted} style={{ flex: 1 }}>
          History
        </T>
        <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      </Pressable>
    </Screen>
  );
}

function localStyles(_theme: Theme) {
  return StyleSheet.create({
    title: { letterSpacing: -0.6 },
    historyRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
  });
}
