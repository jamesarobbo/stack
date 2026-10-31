import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Platform, StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { CompactMenuPickerShell, NativeMenuPicker } from './NativeMenuPicker';
import { T } from './ui';

/**
 * Ingredient unit. iOS: SwiftUI menu picker anchored to the control (checkmark on current).
 * Android: system dropdown. compact: short control for amount+unit rows.
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

  if (Platform.OS === 'ios') {
    const menu = (
      <NativeMenuPicker
        options={UNIT_OPTIONS}
        value={selected}
        onChange={onChange}
        accessibilityLabel={compact ? `Unit, ${selected}` : `${label}, ${selected}`}
      />
    );
    if (compact) {
      return <CompactMenuPickerShell>{menu}</CompactMenuPickerShell>;
    }
    return (
      <View style={styles.wrap}>
        <T size={12} weight="semibold" color={theme.muted}>
          {label}
        </T>
        <View style={styles.iosField}>{menu}</View>
      </View>
    );
  }

  // Fallback (should use UnitField.web on web)
  return (
    <View style={compact ? undefined : styles.wrap}>
      {compact ? null : (
        <T size={12} weight="semibold" color={theme.muted}>
          {label}
        </T>
      )}
      <View style={compact ? styles.compact : styles.field}>
        <T weight="semibold">{selected}</T>
        <Ionicons name="chevron-down" size={16} color={theme.muted} />
      </View>
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
    iosField: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: 12,
      minHeight: 44,
      justifyContent: 'center',
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
