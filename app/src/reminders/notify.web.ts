import { notificationSlots, type Reminder, type ReminderSlot } from '../../../shared/reminders';

export type ReminderAccess = 'granted' | 'denied' | 'unavailable';

/** Web has no local notification schedule. The Today list still works. */
export async function readReminderAccess(): Promise<ReminderAccess> {
  return 'unavailable';
}

export async function requestReminderAccess(): Promise<ReminderAccess> {
  return 'unavailable';
}

export async function applySchedule(_slots: ReminderSlot[]): Promise<void> {}

export async function syncSchedule(reminders: Reminder[], products: { id: string; name: string }[]): Promise<void> {
  await applySchedule(notificationSlots(reminders, products));
}

export function watchReminders(_onResponse: (event: { productIds: string[]; taken: boolean }) => void): () => void {
  return () => undefined;
}
