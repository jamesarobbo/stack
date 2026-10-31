import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { formatClock, isValidTime } from '../../../shared/reminders';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

function dateFromTime(time: string): Date {
  const date = new Date();
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  date.setHours(match ? Number(match[1]) : 8, match ? Number(match[2]) : 0, 0, 0);
  return date;
}

function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * A clock time the person chose.
 * iOS uses the compact control, which opens the time picker when tapped.
 * Android opens the system dialog. Web uses a time input.
 * Nothing stays on screen as a spinner wheel.
 */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  const shown = isValidTime(value) ? value : '08:00';

  function commit(date?: Date) {
    if (!date) return;
    const next = timeFromDate(date);
    if (next !== value) onChange(next);
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed') return;
    commit(date);
  }

  return (
    <View style={styles.row}>
      <T size={16} weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={dateFromTime(shown)}
          mode="time"
          display="compact"
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          accentColor={theme.action}
          accessibilityLabel={label}
          onChange={onPickerChange}
        />
      ) : Platform.OS === 'web' ? (
        createElement('input', {
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
            borderRadius: 8,
            minHeight: 36,
            padding: '8px 12px',
            fontSize: 16,
            fontWeight: '600',
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${formatClock(shown)}`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.value, pressed ? { opacity: 0.85 } : null]}
        >
          <T weight="semibold">{formatClock(shown)}</T>
        </Pressable>
      )}
      {Platform.OS !== 'ios' && Platform.OS !== 'web' && open ? (
        <DateTimePicker value={dateFromTime(shown)} mode="time" display="default" onChange={onPickerChange} />
      ) : null}
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
    value: {
      minHeight: 36,
      justifyContent: 'center',
      backgroundColor: theme.greyPill,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
  });
}
