import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useCallback } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/**
 * Ingredient unit. Opens a system menu.
 * compact: a short button for amount+unit rows (no Unit label).
 * Full: labeled field for rare standalone use.
 */
export function UnitField({
  label = 'Unit',
  value,
  onChange,
  compact = false,
}: {
  label?: string;
  value: string;
  onChange: (unit: UnitOption) => void;
  compact?: boolean;
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
    if (compact) {
      return (
        <View style={styles.compactAndroid}>
          <Picker
            selectedValue={selected}
            onValueChange={(next) => onChange(coerceUnit(String(next)))}
            mode="dropdown"
            accessibilityLabel="Unit"
            dropdownIconColor={theme.muted}
            style={styles.compactAndroidPicker}
          >
            {UNIT_OPTIONS.map((option) => (
              <Picker.Item key={option} label={option} value={option} color={theme.text} />
            ))}
          </Picker>
        </View>
      );
    }
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

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unit, ${selected}`}
        accessibilityHint="Opens a menu of units"
        onPress={openIos}
        style={({ pressed }) => [styles.compact, pressed ? { opacity: 0.88 } : null]}
      >
        <T weight="semibold">{selected}</T>
        <Ionicons name="chevron-down" size={16} color={theme.muted} />
      </Pressable>
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
        <Ionicons name="chevron-down" size={16} color={theme.muted} />
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
    compact: {
      backgroundColor: theme.greyPill,
      borderRadius: 10,
      paddingHorizontal: 12,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'stretch',
    },
    compactAndroid: {
      backgroundColor: theme.greyPill,
      borderRadius: 10,
      overflow: 'hidden',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 88,
    },
    compactAndroidPicker: {
      width: 110,
      color: theme.text,
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
