import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { theme } from '../theme';
import { T } from './ui';

/**
 * Ingredient unit picker. Stores one of the label options, defaulting to mg.
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
  const selected = coerceUnit(value);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.field, open && styles.fieldOpen]}
      >
        <T weight="semibold">{selected}</T>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {UNIT_OPTIONS.map((option) => {
            const on = option === selected;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={[styles.option, on && styles.optionOn]}
              >
                <T weight={on ? 'semibold' : 'regular'} color={on ? theme.teal : theme.text}>
                  {option}
                </T>
                {on ? <Ionicons name="checkmark" size={16} color={theme.teal} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  field: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldOpen: { borderColor: theme.teal },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionOn: { backgroundColor: theme.tealSoft },
});
