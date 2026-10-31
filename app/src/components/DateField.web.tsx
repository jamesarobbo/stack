import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { clampStartDate, formatUsDate, localToday } from '../dates';
import { font, useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/**
 * Web fallback. The browser date input stores YYYY-MM-DD.
 * The line above it is the US display (for example Oct 30, 2026).
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
  const styles = useThemedStyles(localStyles);
  const today = localToday();
  const iso = clampStartDate(value, today);

  return (
    <View style={styles.wrap}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <View style={styles.field}>
        <T weight="semibold">{formatUsDate(iso)}</T>
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
            marginTop: 8,
            width: '100%',
            boxSizing: 'border-box',
            border: 'none',
            background: 'transparent',
            color: theme.text,
            fontWeight: font.regular,
            fontSize: 16,
            padding: 0,
          },
        })}
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
    paddingVertical: 12,
  },
});
}

