import { Platform } from 'react-native';
import { notificationSlots, reminderTitle, type Reminder, type ReminderSlot } from '../../../shared/reminders';

export type ReminderAccess = 'granted' | 'denied' | 'unavailable';

type NotificationsModule = typeof import('expo-notifications');

const PREFIX = 'stack-';
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
  await Notifications.setNotificationCategoryAsync('stack-reminder', [
    {
      identifier: 'mark-taken',
      buttonTitle: 'Mark as taken',
      options: { opensAppToForeground: true },
    },
  ]);
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

export async function applySchedule(slots: ReminderSlot[]): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    const access = await readReminderAccess();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled.filter((item) => item.identifier.startsWith(PREFIX)).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    if (access !== 'granted') return;
    await prepare(Notifications);
    const limited = slots.slice(0, 60);
    for (const slot of limited) {
      const [hour, minute] = slot.time.split(':').map(Number);
      const identifier = `${PREFIX}${slot.time.replace(':', '')}-${slot.weekday ?? 'd'}`;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: reminderTitle(slot.names),
          categoryIdentifier: 'stack-reminder',
          data: { productIds: slot.productIds },
        },
        trigger:
          slot.weekday == null
            ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' }
            : {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: slot.weekday + 1,
                hour,
                minute,
                channelId: 'reminders',
              },
      });
    }
  } catch {
    // The native module is absent until a new build. Keep the saved times.
  }
}

export async function syncSchedule(reminders: Reminder[], products: { id: string; name: string }[]): Promise<void> {
  await applySchedule(notificationSlots(reminders, products));
}

export function watchReminders(onResponse: (event: { productIds: string[]; taken: boolean }) => void): () => void {
  let remove: () => void = () => undefined;
  let cancelled = false;
  void load().then((Notifications) => {
    if (!Notifications || cancelled) return;
    try {
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { productIds?: unknown };
        const productIds = Array.isArray(data?.productIds) ? data.productIds.filter((id): id is string => typeof id === 'string') : [];
        onResponse({ productIds, taken: response.actionIdentifier === 'mark-taken' });
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
