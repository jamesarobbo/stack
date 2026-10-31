import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { loggedStreak, streakLine, type IntakeLog } from '../../../shared/reminders';
import { localToday } from '../dates';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

export function TodayList({
  products,
  logs,
  onToggle,
  onAllTaken,
}: {
  products: { id: string; name: string }[];
  logs: IntakeLog[];
  onToggle: (productId: string, day: string, taken: boolean) => void;
  onAllTaken: (day: string) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const today = localToday();
  const taken = new Set(logs.filter((log) => log.day === today).map((log) => log.productId));
  const streak = streakLine(loggedStreak(logs, today));
  const pending = products.some((product) => !taken.has(product.id));

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
      {products.length === 0 ? (
        <T size={15} color={theme.muted}>
          Nothing to log yet.
        </T>
      ) : (
        <>
          {pending ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all as taken"
              onPress={() => onAllTaken(today)}
              style={({ pressed }) => [styles.all, pressed ? { opacity: 0.88 } : null]}
            >
              <T weight="semibold" color={theme.teal}>
                All taken
              </T>
            </Pressable>
          ) : null}
          {products.map((product) => {
            const on = taken.has(product.id);
            return (
              <View key={product.id} style={styles.row}>
                <T weight="semibold" style={{ flex: 1 }}>
                  {product.name}
                </T>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={on ? `${product.name} taken` : `Mark ${product.name} as taken`}
                  accessibilityState={{ checked: on }}
                  onPress={() => onToggle(product.id, today, on)}
                  style={({ pressed }) => [styles.taken, pressed ? { opacity: 0.88 } : null]}
                >
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? theme.teal : theme.muted} />
                  <T weight="semibold" color={on ? theme.teal : theme.text}>
                    Taken
                  </T>
                </Pressable>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    all: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
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
