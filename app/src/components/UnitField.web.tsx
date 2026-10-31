import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/** Web uses a native select. */
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

  return (
    <View style={styles.wrap}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      {createElement(
        'select',
        {
          'aria-label': label,
          value: selected,
          onChange: (event: { target: { value: string } }) => onChange(coerceUnit(event.target.value)),
          style: {
            backgroundColor: theme.card,
            color: theme.text,
            border: `1px solid ${theme.line}`,
            borderRadius: 12,
            minHeight: 44,
            padding: '10px 12px',
            fontSize: 16,
            fontWeight: 600,
            width: '100%',
          },
        },
        UNIT_OPTIONS.map((option) => createElement('option', { key: option, value: option }, option)),
      )}
    </View>
  );
}

function localStyles(_theme: Theme) {
  return StyleSheet.create({
    wrap: { gap: 4 },
  });
}
