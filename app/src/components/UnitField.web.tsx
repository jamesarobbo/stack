import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { coerceUnit, UNIT_OPTIONS, type UnitOption } from '../data/units';
import { control, space, typeSize, useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/** Web uses a native select. compact hides the Unit label for amount rows. */
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

  return (
    <View style={compact ? styles.compactWrap : styles.wrap}>
      {compact ? null : (
        <T size={12} weight="semibold" color={theme.muted}>
          {label}
        </T>
      )}
      {createElement(
        'select',
        {
          'aria-label': label,
          value: selected,
          onChange: (event: { target: { value: string } }) => onChange(coerceUnit(event.target.value)),
          style: {
            backgroundColor: compact ? theme.greyPill : theme.card,
            color: theme.text,
            border: compact ? 'none' : `1px solid ${theme.line}`,
            borderRadius: compact ? 10 : 12,
            minHeight: control.height,
            padding: compact ? '10px 12px' : '10px 12px',
            fontSize: typeSize.body,
            fontWeight: 600,
            width: compact ? '100%' : '100%',
            maxWidth: '100%',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          },
        },
        UNIT_OPTIONS.map((option) => createElement('option', { key: option, value: option }, option)),
      )}
    </View>
  );
}

function localStyles(_theme: Theme) {
  return StyleSheet.create({
    wrap: { gap: space.xs },
    compactWrap: { alignSelf: 'stretch' },
  });
}
