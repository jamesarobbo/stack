import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { clampStartDate, formatUsDate, isoFromLocalDate, localDateFromIso, localToday } from '../dates';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/**
 * Start date for a supplement.
 * One row: the label on the left, the date on the right.
 * iOS uses the compact control, which opens a calendar popover.
 * Android opens the system dialog. Web uses a date input.
 * Nothing stays on screen as a spinner wheel.
 * The value is YYYY-MM-DD and cannot be after today.
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
  const scheme = useColorScheme();
  const today = localToday();
  const iso = clampStartDate(value, today);
  const [open, setOpen] = useState(false);

  function commit(date?: Date) {
    if (!date) return;
    onChange(clampStartDate(isoFromLocalDate(date), today));
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
          value={localDateFromIso(iso)}
          mode="date"
          display="compact"
          maximumDate={localDateFromIso(today)}
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          accentColor={theme.action}
          accessibilityLabel={label}
          onChange={onPickerChange}
        />
      ) : Platform.OS === 'web' ? (
        <WebDate iso={iso} today={today} label={label} color={theme.text} fill={theme.greyPill} onChange={onChange} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${formatUsDate(iso)}`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.value, pressed ? { opacity: 0.85 } : null]}
        >
          <T weight="semibold">{formatUsDate(iso)}</T>
        </Pressable>
      )}
      {Platform.OS !== 'ios' && Platform.OS !== 'web' && open ? (
        <DateTimePicker
          value={localDateFromIso(iso)}
          mode="date"
          display="default"
          maximumDate={localDateFromIso(today)}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

function WebDate({
  iso,
  today,
  label,
  color,
  fill,
  onChange,
}: {
  iso: string;
  today: string;
  label: string;
  color: string;
  fill: string;
  onChange: (iso: string) => void;
}) {
  return createElement('input', {
    type: 'date',
    value: iso,
    max: today,
    'aria-label': label,
    onChange: (event: Event) => {
      const next = (event.target as HTMLInputElement).value;
      if (next) onChange(clampStartDate(next, today));
    },
    style: {
      color,
      backgroundColor: fill,
      fontSize: 16,
      fontWeight: '600',
      border: 'none',
      borderRadius: 8,
      minHeight: 36,
      padding: '8px 12px',
    },
  });
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    value: {
      backgroundColor: theme.greyPill,
      borderRadius: 8,
      paddingHorizontal: 12,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
