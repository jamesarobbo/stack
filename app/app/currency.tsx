import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { CURRENCIES } from '../../shared/money';
import { BackButton, Screen, T } from '@/src/components/ui';
import { useApp } from '@/src/state';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function CurrencyScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  return (
    <Screen>
      <BackButton />
      <T weight="semibold" size={32} style={styles.title}>
        Currency
      </T>
      <T size={15} color={theme.muted}>
        Prices you enter from now on use this currency. Amounts already saved stay as they were entered. Nothing is converted.
      </T>
      <View style={styles.menu}>
        {CURRENCIES.map((item, index) => {
          const selected = app.currency === item.code;
          const last = index === CURRENCIES.length - 1;
          return (
            <Pressable
              key={item.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.name}
              onPress={() => void app.setCurrency(item.code)}
              style={[styles.row, last ? styles.rowLast : null]}
            >
              <T weight={selected ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                {item.name}
              </T>
              {selected ? <Ionicons name="checkmark" size={20} color={theme.action} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    title: { letterSpacing: -0.8 },
    menu: { backgroundColor: theme.card, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
    row: {
      minHeight: control.height,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
    },
    rowLast: { borderBottomWidth: 0 },
  });
}
