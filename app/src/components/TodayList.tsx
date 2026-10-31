import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { dayHeading, dayIsEditable, type IntakeLog } from '../../../shared/reminders';
import { localToday } from '../dates';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

export function TodayList({
  products,
  logs,
  day,
  onToggle,
  onAllTaken,
  onOpen,
}: {
  products: { id: string; name: string }[];
  logs: IntakeLog[];
  day?: string;
  onToggle: (productId: string, day: string, taken: boolean) => void;
  onAllTaken: (day: string) => void;
  onOpen?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const today = localToday();
  const shown = day ?? today;
  const editable = dayIsEditable(shown, today);
  const taken = new Set(logs.filter((log) => log.day === shown).map((log) => log.productId));
  const pending = products.some((product) => !taken.has(product.id));
  const visible = editable ? products : products.filter((product) => taken.has(product.id));

  const heading = (
    <View style={styles.heading}>
      <T weight="semibold" size={17}>
        {dayHeading(shown, today)}
      </T>
      {onOpen ? <Ionicons name="chevron-forward" size={18} color={theme.muted} /> : null}
    </View>
  );

  return (
    <View style={{ gap: 10 }}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open today"
          onPress={onOpen}
          style={({ pressed }) => [pressed ? { opacity: 0.88 } : null]}
        >
          {heading}
        </Pressable>
      ) : (
        heading
      )}
      {visible.length === 0 ? (
        <T size={15} color={theme.muted}>
          {products.length === 0 && editable ? 'Nothing to log yet.' : 'Nothing logged.'}
        </T>
      ) : (
        <>
          {editable && pending ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all as taken"
              onPress={() => onAllTaken(shown)}
              style={({ pressed }) => [styles.all, pressed ? { opacity: 0.88 } : null]}
            >
              <T weight="semibold" color={theme.teal}>
                All taken
              </T>
            </Pressable>
          ) : editable ? (
            <View style={styles.all} accessible accessibilityLabel="All taken today">
              <T size={15} color={theme.muted}>
                All taken today
              </T>
            </View>
          ) : null}
          {visible.map((product) => {
            const on = taken.has(product.id);
            if (!editable) {
              return (
                <View key={product.id} accessible accessibilityLabel={`${product.name}, logged`} style={styles.row}>
                  <T weight="semibold" style={{ flex: 1 }}>
                    {product.name}
                  </T>
                </View>
              );
            }
            return (
              <View key={product.id} style={styles.row}>
                <T weight="semibold" style={{ flex: 1 }}>
                  {product.name}
                </T>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={on ? `${product.name} taken` : `Mark ${product.name} as taken`}
                  accessibilityState={{ checked: on }}
                  onPress={() => onToggle(product.id, shown, on)}
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
    heading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
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
