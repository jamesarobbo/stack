import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { clampStartDate, formatUsDate, isoFromLocalDate, localDateFromIso, localToday } from '../dates';
import { font, theme } from '../theme';
import { T } from './ui';

/**
 * Start date for a supplement.
 * iOS shows the native spinner. Android opens the system date dialog.
 * The value is a YYYY-MM-DD string and cannot be after today.
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
  const today = localToday();
  const iso = clampStartDate(value, today);
  const [open, setOpen] = useState(false);

  function commit(date?: Date) {
    if (!date) return;
    onChange(clampStartDate(isoFromLocalDate(date), today));
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') return;
    commit(date);
  }

  return (
    <View style={styles.wrap}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      {Platform.OS === 'ios' ? (
        <View style={styles.field}>
          <T weight="semibold">{formatUsDate(iso)}</T>
          <DateTimePicker
            value={localDateFromIso(iso)}
            mode="date"
            display="spinner"
            maximumDate={localDateFromIso(today)}
            themeVariant="light"
            textColor={theme.text}
            onChange={onPickerChange}
          />
        </View>
      ) : (
        <>
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.field}>
            <T weight="semibold">{formatUsDate(iso)}</T>
          </Pressable>
          {open ? (
            <DateTimePicker
              value={localDateFromIso(iso)}
              mode="date"
              display="default"
              maximumDate={localDateFromIso(today)}
              onChange={onPickerChange}
            />
          ) : null}
        </>
      )}
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
    fontFamily: font.regular,
  },
});
