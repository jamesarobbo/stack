import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { isValidTime } from '../../../shared/reminders';
import { requestReminderAccess, readReminderAccess, type ReminderAccess } from '../reminders/notify';
import { getSetting, setSetting } from '../settings';
import { useApp } from '../state';
import { useTheme } from '../theme';
import { TimeField } from './TimeField';
import { Button, Card, T } from './ui';

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const EXPLANATION = 'A daily reminder asks you to log what you took. You choose the time. Stack does not suggest one.';

export function DailyReminderCard() {
  const theme = useTheme();
  const app = useApp();
  const [asking, setAsking] = useState(false);
  const [access, setAccess] = useState<ReminderAccess | 'unknown'>('unknown');

  useEffect(() => {
    let cancel = false;
    void readReminderAccess().then((next) => {
      if (!cancel) setAccess(next);
    });
    return () => {
      cancel = true;
    };
  }, [app.dailyReminder]);

  async function enable() {
    await setSetting('dailyReminderPromptSeen', '1');
    const next = await requestReminderAccess();
    setAccess(next);
    setAsking(false);
    const stored = app.dailyReminderTime;
    const time = stored && isValidTime(stored) ? stored : nowTime();
    await app.setDailyReminder(true, time);
  }

  function onToggle(next: boolean) {
    if (!next) {
      setAsking(false);
      void app.setDailyReminder(false);
      return;
    }
    if (getSetting('dailyReminderPromptSeen') !== '1') {
      setAsking(true);
      return;
    }
    void enable();
  }

  const time = app.dailyReminderTime && isValidTime(app.dailyReminderTime) ? app.dailyReminderTime : nowTime();

  return (
    <Card>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="semibold">Daily reminder</T>
          {app.dailyReminder || asking ? null : (
            <T size={13} color={theme.muted}>
              Off until you turn it on. You choose the time.
            </T>
          )}
        </View>
        <Switch
          accessibilityLabel="Daily reminder"
          value={app.dailyReminder}
          onValueChange={(next) => onToggle(next)}
          trackColor={{ false: theme.greyPill, true: theme.action }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.greyPill}
        />
      </View>
      {asking ? (
        <View style={{ gap: 10 }}>
          <T size={15}>{EXPLANATION}</T>
          <Button label="Continue" onPress={() => void enable()} />
          <Button label="Not now" tone="ghost" onPress={() => setAsking(false)} />
        </View>
      ) : null}
      {app.dailyReminder ? (
        <TimeField label="Time" value={time} onChange={(next) => void app.setDailyReminderTime(next)} />
      ) : null}
      {app.dailyReminder && access === 'denied' ? (
        <T size={13} color={theme.muted}>
          Notifications are off. You can still log what you took in Today.
        </T>
      ) : null}
    </Card>
  );
}

export function ReminderOffer({ onContinue, onDismiss }: { onContinue: () => void; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <Card>
      <T weight="semibold" size={17}>
        Daily reminder
      </T>
      <T size={15}>{EXPLANATION}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingRight: 12 }, pressed ? { opacity: 0.88 } : null]}
        >
          <T weight="semibold" color={theme.teal}>
            Continue
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Not now"
          onPress={onDismiss}
          style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, pressed ? { opacity: 0.88 } : null]}
        >
          <T weight="semibold" color={theme.muted}>
            Not now
          </T>
        </Pressable>
      </View>
    </Card>
  );
}
