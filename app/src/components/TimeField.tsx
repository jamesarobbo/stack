import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
 * One row shows the label and the value. Tap opens a native sheet on iOS
 * with a spinner wheel, Cancel, and Done. Android keeps the system dialog.
 */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const shown = isValidTime(value) ? value : '08:00';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(shown);

  function openSheet() {
    setDraft(shown);
    setOpen(true);
  }

  function onAndroidChange(event: DateTimePickerEvent, date?: Date) {
    setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    const next = timeFromDate(date);
    if (next !== value) onChange(next);
  }

  function onIosSpin(_event: DateTimePickerEvent, date?: Date) {
    if (!date) return;
    setDraft(timeFromDate(date));
  }

  function confirmIos() {
    if (isValidTime(draft) && draft !== value) onChange(draft);
    setOpen(false);
  }

  return (
    <View style={styles.row}>
      <T size={16} weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatClock(shown)}`}
        accessibilityHint="Opens a time picker"
        onPress={openSheet}
        style={({ pressed }) => [styles.value, pressed ? { opacity: 0.85 } : null]}
      >
        <T weight="semibold">{formatClock(shown)}</T>
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker value={dateFromTime(shown)} mode="time" display="default" onChange={onAndroidChange} />
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
              value={dateFromTime(draft)}
              mode="time"
              display="spinner"
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
    row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
    value: {
      minHeight: 36,
      justifyContent: 'center',
      backgroundColor: theme.greyPill,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
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
