import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ALL_DAYS, DAY_NAMES, DAY_SHORT, daysLabel, formatClock, type Reminder } from '../../../shared/reminders';
import { requestReminderAccess, readReminderAccess, type ReminderAccess } from '../reminders/notify';
import { getSetting, setSetting } from '../settings';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { Button, Card, T } from './ui';
import { TimeField } from './TimeField';

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function toggleDay(days: string, day: number): string | null {
  const set = new Set(days.split(''));
  const key = String(day);
  if (set.has(key)) {
    if (set.size === 1) return null;
    set.delete(key);
  } else {
    set.add(key);
  }
  return [...set].sort().join('');
}

export function RemindersCard({
  productId,
  reminders,
  onAdd,
  onChange,
  onRemove,
}: {
  productId: string;
  reminders: Reminder[];
  onAdd: (time: string, days: string) => Promise<void>;
  onChange: (id: string, patch: { time?: string; days?: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const mine = reminders.filter((reminder) => reminder.productId === productId);
  const [prompt, setPrompt] = useState(false);
  const [access, setAccess] = useState<ReminderAccess | 'unknown'>('unknown');

  useEffect(() => {
    let cancel = false;
    void readReminderAccess().then((next) => {
      if (!cancel) setAccess(next);
    });
    return () => {
      cancel = true;
    };
  }, [mine.length]);

  async function addTime() {
    await onAdd(nowTime(), ALL_DAYS);
  }

  async function startAdd() {
    const seen = getSetting('reminderPromptSeen') === '1';
    if (!seen && reminders.length === 0) {
      setPrompt(true);
      return;
    }
    await addTime();
  }

  async function allow() {
    await setSetting('reminderPromptSeen', '1');
    const next = await requestReminderAccess();
    setAccess(next);
    setPrompt(false);
    await addTime();
  }

  async function later() {
    await setSetting('reminderPromptSeen', '1');
    setPrompt(false);
    await addTime();
  }

  const summary = mine.length === 0 ? 'Off' : mine.length === 1 ? '1 time' : `${mine.length} times`;

  return (
    <Card>
      <View style={styles.heading}>
        <T weight="semibold" size={17}>
          Reminders
        </T>
        <T size={15} color={theme.muted}>
          {summary}
        </T>
      </View>
      {prompt ? (
        <View style={{ gap: 10 }}>
          <T size={15}>Reminders notify you at the times you choose. Stack does not suggest a dose or a schedule.</T>
          <Button label="Continue" onPress={() => void allow()} />
          <Button label="Not now" tone="ghost" onPress={() => void later()} />
        </View>
      ) : (
        <>
          {mine.map((reminder) => (
            <View key={reminder.id} style={{ gap: 8 }}>
              <View style={styles.heading}>
                <View style={{ flex: 1 }}>
                  <TimeField label="Time" value={reminder.time} onChange={(time) => void onChange(reminder.id, { time })} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${formatClock(reminder.time)}`}
                  onPress={() => void onRemove(reminder.id)}
                  style={({ pressed }) => [styles.remove, pressed ? { opacity: 0.88 } : null]}
                >
                  <T weight="semibold" color={theme.teal}>
                    Remove
                  </T>
                </Pressable>
              </View>
              <T size={13} color={theme.muted}>
                {daysLabel(reminder.days)}
              </T>
              <View style={styles.days}>
                {DAY_SHORT.map((label, index) => {
                  const on = reminder.days.includes(String(index));
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      accessibilityLabel={DAY_NAMES[index]}
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        const next = toggleDay(reminder.days, index);
                        if (next) void onChange(reminder.id, { days: next });
                      }}
                      style={({ pressed }) => [styles.day, on ? styles.dayOn : null, pressed ? { opacity: 0.88 } : null]}
                    >
                      <T size={13} weight="semibold" color={on ? theme.teal : theme.muted}>
                        {label}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a time"
            onPress={() => void startAdd()}
            style={({ pressed }) => [styles.add, pressed ? { opacity: 0.88 } : null]}
          >
            <Ionicons name="add" size={18} color={theme.teal} />
            <T weight="semibold" color={theme.teal}>
              Add a time
            </T>
          </Pressable>
          {access === 'denied' ? (
            <T size={13} color={theme.muted}>
              Notifications are off. You can still mark what you took in Today.
            </T>
          ) : null}
        </>
      )}
    </Card>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
    days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    day: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.card,
    },
    dayOn: { backgroundColor: theme.tealSoft, borderColor: theme.teal },
    add: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  });
}
