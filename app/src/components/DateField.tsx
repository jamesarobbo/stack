import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { clampStartDate, formatUsDate, isoFromLocalDate, localDateFromIso, localToday } from '../dates';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';
import { WheelSheet } from './WheelSheet';

/**
 * Start date for a supplement.
 * One row shows the label and the value. Tap opens a native sheet on iOS
 * with a spinner wheel, Cancel, and Done. Android keeps the system dialog.
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
  const [draft, setDraft] = useState(iso);

  function openSheet() {
    setDraft(iso);
    setOpen(true);
  }

  function onAndroidChange(event: DateTimePickerEvent, date?: Date) {
    setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(clampStartDate(isoFromLocalDate(date), today));
  }

  function onIosSpin(_event: DateTimePickerEvent, date?: Date) {
    if (!date) return;
    setDraft(clampStartDate(isoFromLocalDate(date), today));
  }

  function confirmIos() {
    onChange(clampStartDate(draft, today));
    setOpen(false);
  }

  return (
    <View style={styles.row}>
      <T size={16} weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatUsDate(iso)}`}
        accessibilityHint="Opens a date picker"
        onPress={openSheet}
        style={({ pressed }) => [styles.value, pressed ? { opacity: 0.85 } : null]}
      >
        <T weight="semibold">{formatUsDate(iso)}</T>
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={localDateFromIso(iso)}
          mode="date"
          display="default"
          maximumDate={localDateFromIso(today)}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <WheelSheet visible={open} title={label} onCancel={() => setOpen(false)} onDone={confirmIos}>
          <DateTimePicker
            value={localDateFromIso(draft)}
            mode="date"
            display="spinner"
            maximumDate={localDateFromIso(today)}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            accentColor={theme.action}
            accessibilityLabel={label}
            onChange={onIosSpin}
            style={styles.spinner}
          />
        </WheelSheet>
      ) : null}
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      minHeight: control.height,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
    },
    value: {
      backgroundColor: theme.greyPill,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      minHeight: control.compact,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spinner: { alignSelf: 'center', width: '100%' },
  });
}
