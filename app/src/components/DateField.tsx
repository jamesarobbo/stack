import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clampStartDate, formatUsDate, isoFromLocalDate, localDateFromIso, localToday } from '../dates';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

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
  const insets = useSafeAreaInsets();
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
        <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={[styles.sheetBar, { borderBottomColor: theme.line }]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => setOpen(false)} hitSlop={8} style={styles.sheetAction}>
                <T size={17} color={theme.action}>
                  Cancel
                </T>
              </Pressable>
              <T weight="semibold" size={17} style={{ flex: 1, textAlign: 'center' }}>
                {label}
              </T>
              <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={confirmIos} hitSlop={8} style={styles.sheetAction}>
                <T size={17} weight="semibold" color={theme.action}>
                  Done
                </T>
              </Pressable>
            </View>
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
          </View>
        </Modal>
      ) : null}
    </View>
  );
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
    sheet: { flex: 1 },
    sheetBar: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sheetAction: { minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    spinner: { alignSelf: 'center', width: '100%' },
  });
}
