import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Platform, StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '../theme';
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
      return (
        <View style={{ flex: 1, height: control.height }}>
          <CompactMenuPickerShell>{menu}</CompactMenuPickerShell>
        </View>
      );
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
    wrap: { gap: space.xs },
    field: {
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: space.md,
      minHeight: control.height,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
    },
    iosField: {
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: space.md,
      minHeight: control.height,
      justifyContent: 'center',
    },
    compact: {
      backgroundColor: theme.greyPill,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      minHeight: control.height,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      alignSelf: 'stretch',
    },
    compactAndroid: {
      flex: 1,
      backgroundColor: theme.greyPill,
      borderRadius: radius.sm,
      overflow: 'hidden',
      justifyContent: 'center',
      height: control.height,
      minHeight: control.height,
    },
    compactAndroidPicker: {
      width: '100%',
      height: control.height,
      color: theme.text,
    },
    androidField: {
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      overflow: 'hidden',
      justifyContent: 'center',
      minHeight: control.height,
    },
    androidPicker: {
      width: '100%',
      color: theme.text,
    },
  });
}
