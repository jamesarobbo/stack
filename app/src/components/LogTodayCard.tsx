import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import type { IntakeLog } from '../../../shared/reminders';
import { localToday } from '../dates';
import { control, space, useTheme, useThemedStyles, type Theme } from '../theme';
import { TodayList } from './TodayList';
import { Card, T } from './ui';

const COLLAPSE_DELAY_MS = 400;
const FADE_MS = 220;
const LAYOUT = LinearTransition.duration(280).reduceMotion(ReduceMotion.System);
const ENTER = FadeIn.duration(FADE_MS).reduceMotion(ReduceMotion.System);
const EXIT = FadeOut.duration(180).reduceMotion(ReduceMotion.System);

type Product = { id: string; name: string };

/**
 * Home Log today / check-in card. One tree that crossfades between the expanded
 * form and a slim All taken today row so height never jumps through an empty frame.
 */
export function LogTodayCard({
  mode,
  products,
  logs,
  onOpen,
  onToggle,
  onAllTaken,
}: {
  mode: 'checkIn' | 'promo';
  products: Product[];
  logs: IntakeLog[];
  onOpen: () => void;
  onToggle: (productId: string, day: string, taken: boolean) => void;
  onAllTaken: (day: string) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const todayKey = localToday();
  const takenToday = useMemo(
    () => new Set(logs.filter((log) => log.day === todayKey).map((log) => log.productId)),
    [logs, todayKey],
  );
  const takenCount = products.reduce((count, product) => count + (takenToday.has(product.id) ? 1 : 0), 0);
  const allTaken = products.length > 0 && takenCount >= products.length;
  const logStatus =
    takenCount === 0
      ? 'Nothing logged yet today'
      : allTaken
        ? 'All taken today'
        : `${takenCount} of ${products.length} taken today`;

  // Collapse is delayed so the last tick is visible; expand is immediate via a timer callback.
  const [collapsed, setCollapsed] = useState(allTaken);
  useEffect(() => {
    if (!allTaken) {
      const expand = setTimeout(() => setCollapsed(false), 0);
      return () => clearTimeout(expand);
    }
    const timer = setTimeout(() => setCollapsed(true), COLLAPSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allTaken]);

  return (
    <Animated.View layout={LAYOUT}>
      {collapsed ? (
        <Animated.View key="collapsed" entering={ENTER} exiting={EXIT} layout={LAYOUT}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All taken today"
            onPress={onOpen}
            style={({ pressed }) => [styles.doneRow, pressed ? { opacity: 0.88 } : null]}
          >
            <Ionicons name="checkmark-circle" size={22} color={theme.action} />
            <T size={15} weight="medium" color={theme.muted} style={{ flex: 1 }}>
              All taken today
            </T>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View key="expanded" entering={ENTER} exiting={EXIT} layout={LAYOUT}>
          {mode === 'checkIn' ? (
            <Card>
              <TodayList products={products} logs={logs} onOpen={onOpen} onToggle={onToggle} onAllTaken={onAllTaken} />
            </Card>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log today. ${logStatus}`}
              onPress={onOpen}
              style={({ pressed }) => [styles.promoCard, pressed ? { opacity: 0.92 } : null]}
            >
              <View style={styles.promoAccent} />
              <Ionicons name="checkmark-circle" size={28} color={theme.action} />
              <View style={styles.promoCopy}>
                <T weight="semibold" size={17}>
                  Log today
                </T>
                <T size={14} color={theme.muted}>
                  {logStatus}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </Pressable>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    promoCard: {
      minHeight: control.listRow,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      paddingLeft: 12,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: theme.bg === '#16130F' ? '#2A3A4A' : '#C5D8EF',
      backgroundColor: theme.tealSoft,
      overflow: 'hidden',
    },
    promoAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: theme.action,
    },
    promoCopy: { flex: 1, gap: space.xxs },
    doneRow: {
      minHeight: control.height,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.card,
    },
  });
}
