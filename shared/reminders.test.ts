import { describe, expect, it } from 'vitest';
import {
  ALL_DAYS,
  dueOnDay,
  notificationSlots,
  reminderTitle,
  takenStreak,
  type IntakeLog,
  type Reminder,
} from './reminders';

const products = [
  { id: 'mag', name: 'Magnesium' },
  { id: 'd', name: 'Vitamin D' },
  { id: 'zinc', name: 'Zinc' },
];

function reminder(partial: Partial<Reminder> & Pick<Reminder, 'productId' | 'time'>): Reminder {
  return { id: partial.id ?? partial.productId + partial.time, days: partial.days ?? ALL_DAYS, ...partial };
}

function log(productId: string, day: string): IntakeLog {
  return { id: `${productId}-${day}`, productId, day, takenAt: `${day}T12:00:00.000Z` };
}

describe('reminder copy', () => {
  it('names one product, two products, or two and a count', () => {
    expect(reminderTitle(['Magnesium'])).toBe('Time for Magnesium');
    expect(reminderTitle(['Vitamin D', 'Magnesium'])).toBe('Time for Magnesium and Vitamin D');
    expect(reminderTitle(['Zinc', 'Magnesium', 'Vitamin D'])).toBe('Time for Magnesium, Vitamin D and 1 more');
  });
});

describe('what is due', () => {
  it('keeps a weekday reminder off Sunday and marks a taken day', () => {
    const reminders = [reminder({ productId: 'mag', time: '08:00', days: '1' })];
    expect(dueOnDay(reminders, products, [], '2026-11-01')).toEqual([]);
    const monday = dueOnDay(reminders, products, [log('mag', '2026-11-02')], '2026-11-02');
    expect(monday).toEqual([{ productId: 'mag', name: 'Magnesium', time: '08:00', taken: true }]);
  });

  it('counts finished days and leaves today open', () => {
    const reminders = [reminder({ productId: 'mag', time: '08:00' })];
    const logs = [log('mag', '2026-10-29'), log('mag', '2026-10-30')];
    expect(takenStreak(reminders, products, logs, '2026-10-31')).toBe(2);
    expect(takenStreak(reminders, products, [...logs, log('mag', '2026-10-31')], '2026-10-31')).toBe(3);
  });

  it('groups the same clock time into one daily notification', () => {
    const slots = notificationSlots(
      [reminder({ productId: 'mag', time: '08:00' }), reminder({ productId: 'd', time: '08:00' }), reminder({ productId: 'zinc', time: '08:00' })],
      products,
    );
    expect(slots).toHaveLength(1);
    expect(slots[0]?.weekday).toBeNull();
    expect(reminderTitle(slots[0]?.names ?? [])).toBe('Time for Magnesium, Vitamin D and 1 more');
  });
});
