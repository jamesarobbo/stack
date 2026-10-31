import { createElement } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { isValidTime } from '../../../shared/reminders';
import { control, radius, space, typeSize, useTheme } from '../theme';
import { T } from './ui';

/** Web stand-in. The time input on the right opens the browser picker when tapped. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const shown = isValidTime(value) ? value : '08:00';

  return (
    <View style={rowStyle}>
      <T size={16} weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      {createElement('input', {
        type: 'time',
        value: shown,
        'aria-label': label,
        onChange: (event: { target: { value: string } }) => {
          if (isValidTime(event.target.value)) onChange(event.target.value);
        },
        style: {
          backgroundColor: theme.greyPill,
          color: theme.text,
          colorScheme: scheme === 'dark' ? 'dark' : 'light',
          border: 'none',
          borderRadius: radius.sm,
          minHeight: control.compact,
          padding: '8px 12px',
          fontSize: typeSize.body,
          fontWeight: '600',
        },
      })}
    </View>
  );
}

const rowStyle = StyleSheet.create({
  row: { minHeight: control.height, flexDirection: 'row', alignItems: 'center', gap: space.md },
}).row;
