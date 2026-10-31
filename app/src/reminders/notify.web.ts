export type ReminderAccess = 'granted' | 'denied' | 'unavailable';

/** Web has no local notification schedule. Today still works. */
export async function readReminderAccess(): Promise<ReminderAccess> {
  return 'unavailable';
}

export async function requestReminderAccess(): Promise<ReminderAccess> {
  return 'unavailable';
}

export async function syncDailyReminder(_enabled: boolean, _time: string | null): Promise<void> {}

export function watchReminders(_onOpen: () => void): () => void {
  return () => undefined;
}
