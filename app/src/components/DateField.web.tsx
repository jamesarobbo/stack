import { createElement } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { clampStartDate, localToday } from '../dates';
import { fontFamily, control, font, radius, space, typeSize, useTheme } from '../theme';
import { T } from './ui';

/**
 * Web stand-in for the native row.
 * The label is on the left. The date input on the right is the value, and it opens the browser picker when tapped.
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const today = localToday();
  const iso = clampStartDate(value, today);

  return (
    <View style={rowStyle}>
      <T size={16} weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      {createElement('input', {
        type: 'date',
        lang: 'en-US',
        value: iso,
        max: today,
        'aria-label': label,
        onChange: (event: { target: { value: string } }) => {
          if (!event.target.value) return;
          onChange(clampStartDate(event.target.value, today));
        },
        style: {
          color: theme.text,
          backgroundColor: theme.greyPill,
          colorScheme: scheme === 'dark' ? 'dark' : 'light',
          fontFamily, fontWeight: font.semibold,
          fontSize: typeSize.body,
          border: 'none',
          borderRadius: radius.sm,
          minHeight: control.compact,
          padding: '8px 12px',
        },
      })}
    </View>
  );
}

const rowStyle = StyleSheet.create({
  row: {
    minHeight: control.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
}).row;
