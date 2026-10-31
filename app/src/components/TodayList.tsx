import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { dueOnDay, formatClock, streakLine, takenStreak, type IntakeLog, type Reminder } from '../../../shared/reminders';
import { localToday } from '../dates';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

export function TodayList({
  reminders,
  products,
  logs,
  onToggle,
}: {
  reminders: Reminder[];
  products: { id: string; name: string }[];
  logs: IntakeLog[];
  onToggle: (productId: string, day: string, taken: boolean) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  if (reminders.length === 0) return null;
  const today = localToday();
  const due = dueOnDay(reminders, products, logs, today);
  const streak = streakLine(takenStreak(reminders, products, logs, today));

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.heading}>
        <T weight="semibold" size={17}>
          Today
        </T>
        {streak ? (
          <T size={13} color={theme.muted}>
            {streak}
          </T>
        ) : null}
      </View>
      {due.length === 0 ? (
        <T size={15} color={theme.muted}>
          Nothing is due today.
        </T>
      ) : (
        due.map((item) => (
          <View key={item.productId} style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <T weight="semibold">{item.name}</T>
              <T size={13} color={theme.muted}>
                {formatClock(item.time)}
              </T>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={item.taken ? `${item.name} taken` : `Mark ${item.name} as taken`}
              accessibilityState={{ checked: item.taken }}
              onPress={() => onToggle(item.productId, today, item.taken)}
              style={({ pressed }) => [styles.taken, pressed ? { opacity: 0.88 } : null]}
            >
              <Ionicons name={item.taken ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.taken ? theme.teal : theme.muted} />
              <T weight="semibold" color={item.taken ? theme.teal : theme.text}>
                Taken
              </T>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.line,
      paddingTop: 10,
    },
    taken: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  });
}
