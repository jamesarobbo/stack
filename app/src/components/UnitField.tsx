import { Picker } from '@react-native-picker/picker';
import { useCallback } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/**
 * Ingredient unit. One row that opens a system menu.
 * iOS uses ActionSheetIOS. Android uses the native dropdown picker.
 */
export function UnitField({
  label = 'Unit',
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (unit: UnitOption) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const selected = coerceUnit(value);

  const openIos = useCallback(() => {
    const options = ['Cancel', ...UNIT_OPTIONS];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        userInterfaceStyle: theme.bg === '#000000' ? 'dark' : 'light',
      },
      (index) => {
        if (index == null || index <= 0) return;
        const next = UNIT_OPTIONS[index - 1];
        if (next) onChange(next);
      },
    );
  }, [onChange, theme.bg]);

  if (Platform.OS === 'android') {
    return (
      <View style={styles.wrap}>
        <T size={12} weight="semibold" color={theme.muted}>
          {label}
        </T>
        <View style={styles.androidField}>
          <Picker
            selectedValue={selected}
            onValueChange={(next) => onChange(coerceUnit(String(next)))}
            mode="dropdown"
            accessibilityLabel={label}
            dropdownIconColor={theme.muted}
            style={styles.androidPicker}
          >
            {UNIT_OPTIONS.map((option) => (
              <Picker.Item key={option} label={option} value={option} color={theme.text} />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected}`}
        accessibilityHint="Opens a menu of units"
        onPress={openIos}
        style={({ pressed }) => [styles.field, pressed ? { opacity: 0.88 } : null]}
      >
        <T weight="semibold">{selected}</T>
        <T size={13} color={theme.muted}>
          Change
        </T>
      </Pressable>
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { gap: 4 },
    field: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: 12,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    androidField: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      overflow: 'hidden',
      justifyContent: 'center',
      minHeight: 44,
    },
    androidPicker: {
      width: '100%',
      color: theme.text,
    },
  });
}
