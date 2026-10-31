import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import {
  WEEKDAY_LABELS,
  canAdvanceMonth,
  dayAccessibilityLabel,
  monthGrid,
  monthParts,
  monthTitle,
  type MonthCell,
} from '../../../shared/reminders';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/**
 * Read-only month history of logged days. Month browse only — days are not
 * selectable for logging (logging is always the device's local today).
 */
export function MonthCalendar({
  today,
  year,
  month,
  loggedDays,
  onPrevious,
  onNext,
}: {
  today: string;
  year: number;
  month: number;
  loggedDays: ReadonlySet<string>;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const canNext = canAdvanceMonth(year, month, today);
  const weeks = useMemo(() => {
    const cells = monthGrid(year, month);
    const rows: MonthCell[][] = [];
    for (let index = 0; index < cells.length; index += 7) rows.push(cells.slice(index, index + 7));
    return rows;
  }, [year, month]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -56) onNext();
          else if (gesture.dx >= 56) onPrevious();
        },
      }),
    [onNext, onPrevious],
  );

  return (
    <View {...pan.panHandlers} style={{ gap: 4 }}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPrevious}
          style={({ pressed }) => [styles.arrow, pressed ? { opacity: 0.88 } : null]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.teal} />
        </Pressable>
        <T weight="semibold" size={17} style={styles.title}>
          {monthTitle(year, month)}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canNext }}
          disabled={!canNext}
          onPress={canNext ? onNext : undefined}
          style={({ pressed }) => [styles.arrow, !canNext ? { opacity: 0.35 } : null, pressed && canNext ? { opacity: 0.88 } : null]}
        >
          <Ionicons name="chevron-forward" size={22} color={canNext ? theme.teal : theme.muted} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.cell}>
            <T size={13} color={theme.muted}>
              {label}
            </T>
          </View>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={`${year}-${month}-${weekIndex}`} style={styles.week}>
          {week.map((cell, dayIndex) => {
            if (!cell.day) return <View key={`blank-${weekIndex}-${dayIndex}`} style={styles.cell} />;
            const day = cell.day;
            const isToday = day === today;
            const isFuture = day > today;
            const logged = loggedDays.has(day);
            const date = monthParts(day).date;
            return (
              <View
                key={day}
                accessible
                accessibilityRole="text"
                accessibilityLabel={dayAccessibilityLabel(day, today, logged)}
                style={styles.cell}
              >
                <View style={styles.markWrap}>
                  <View style={[styles.mark, isToday ? styles.today : null]}>
                    <T size={15} weight={isToday ? 'semibold' : 'regular'} color={isFuture ? theme.muted : theme.text}>
                      {date}
                    </T>
                  </View>
                  <View style={logged ? styles.dot : styles.dotSpacer} />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    header: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
    title: { flex: 1, textAlign: 'center' },
    arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    week: { flexDirection: 'row' },
    cell: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    markWrap: { alignItems: 'center' },
    mark: {
      minWidth: 32,
      minHeight: 32,
      paddingHorizontal: 4,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    today: { borderWidth: 1.5, borderColor: theme.text },
    dot: { width: 7, height: 7, borderRadius: 4, marginTop: 2, backgroundColor: theme.action },
    dotSpacer: { width: 7, height: 7, marginTop: 2 },
  });
}
