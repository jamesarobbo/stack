import { Platform } from 'react-native';
import { DAILY_REMINDER_TEXT, isValidTime } from '../../../shared/reminders';

export type ReminderAccess = 'granted' | 'denied' | 'unavailable';

type NotificationsModule = typeof import('expo-notifications');

const PREFIX = 'stack-';
const IDENTIFIER = 'stack-daily';
let loaded: NotificationsModule | null | undefined;
let handlerReady = false;

async function load(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (loaded !== undefined) return loaded;
  try {
    loaded = await import('expo-notifications');
  } catch {
    loaded = null;
  }
  return loaded;
}

async function prepare(Notifications: NotificationsModule): Promise<void> {
  if (!handlerReady) {
    handlerReady = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function readReminderAccess(): Promise<ReminderAccess> {
  const Notifications = await load();
  if (!Notifications) return 'unavailable';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.status === 'denied' ? 'denied' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Shows the system prompt. Call this only after the in-app explanation, never at launch. */
export async function requestReminderAccess(): Promise<ReminderAccess> {
  const Notifications = await load();
  if (!Notifications) return 'unavailable';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    const next = await Notifications.requestPermissionsAsync();
    return next.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** One local notification a day, or none. Cancels any older per-product reminders. */
export async function syncDailyReminder(enabled: boolean, time: string | null): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled.filter((item) => item.identifier.startsWith(PREFIX)).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    if (!enabled || !time || !isValidTime(time)) return;
    const access = await readReminderAccess();
    if (access !== 'granted') return;
    await prepare(Notifications);
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER,
      content: {
        title: DAILY_REMINDER_TEXT,
        data: { screen: 'today' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
    });
  } catch {
    // The native module is absent until a new build. The saved choice stays.
  }
}

export function watchReminders(onOpen: () => void): () => void {
  let remove: () => void = () => undefined;
  let cancelled = false;
  void load().then((Notifications) => {
    if (!Notifications || cancelled) return;
    try {
      const subscription = Notifications.addNotificationResponseReceivedListener(() => {
        onOpen();
      });
      remove = () => subscription.remove();
    } catch {
      remove = () => undefined;
    }
  });
  return () => {
    cancelled = true;
    remove();
  };
}
