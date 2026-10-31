import { describe, expect, it } from 'vitest';
import {
  DAILY_REMINDER_TEXT,
  WEEKDAY_LABELS,
  canAdvanceMonth,
  dayAccessibilityLabel,
  dayHeading,
  dayIsEditable,
  loggedStreak,
  monthGrid,
  monthTitle,
  shiftMonth,
  streakLine,
  type IntakeLog,
} from './reminders';

function log(productId: string, day: string): IntakeLog {
  return { id: `${productId}-${day}`, productId, day, takenAt: `${day}T12:00:00.000Z` };
}

describe('daily reminder', () => {
  it('uses one sentence and no dose', () => {
    expect(DAILY_REMINDER_TEXT).toBe('Log what you took today');
    expect(DAILY_REMINDER_TEXT).not.toMatch(/dose|mg|schedule/i);
  });

  it('counts logged days and leaves today open', () => {
    const logs = [log('mag', '2026-10-29'), log('d', '2026-10-30')];
    expect(loggedStreak(logs, '2026-10-31')).toBe(2);
    expect(loggedStreak([...logs, log('mag', '2026-10-31')], '2026-10-31')).toBe(3);
    expect(streakLine(0)).toBeNull();
    expect(streakLine(1)).toBe('1 day logged in a row');
    expect(streakLine(3)).toBe('3 days logged in a row');
  });

  it('stops the run when a day was not logged', () => {
    const logs = [log('mag', '2026-10-29'), log('mag', '2026-10-31')];
    expect(loggedStreak(logs, '2026-10-31')).toBe(1);
  });
});

describe('month calendar', () => {
  it('builds a Sunday-first October and keeps weekday names in sentence case', () => {
    const grid = monthGrid(2026, 10);
    const first = new Date(2026, 9, 1).getDay();
    expect(grid[first]?.day).toBe('2026-10-01');
    expect(grid.at(-1)?.day).toBe('2026-10-31');
    expect(grid).toHaveLength(Math.ceil((first + 31) / 7) * 7);
    expect(WEEKDAY_LABELS).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    for (const label of WEEKDAY_LABELS) expect(label).not.toBe(label.toUpperCase());
    expect(monthTitle(2026, 10)).toBe('October 2026');
  });

  it('stops at the current month and names a past day without blame', () => {
    expect(canAdvanceMonth(2026, 10, '2026-10-31')).toBe(false);
    expect(canAdvanceMonth(2026, 9, '2026-10-31')).toBe(true);
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(dayIsEditable('2026-10-31', '2026-10-31')).toBe(true);
    expect(dayIsEditable('2026-10-25', '2026-10-31')).toBe(false);
    expect(dayIsEditable('2026-10-24', '2026-10-31')).toBe(false);
    expect(dayIsEditable('2026-11-01', '2026-10-31')).toBe(false);
    expect(dayHeading('2026-10-31', '2026-10-31')).toBe('Today');
    expect(dayHeading('2026-10-28', '2026-10-31')).toBe('October 28');
    expect(dayHeading('2025-10-28', '2026-10-31')).toBe('October 28, 2025');
    expect(dayAccessibilityLabel('2026-10-28', '2026-10-31', true)).toBe('October 28, logged');
    expect(dayAccessibilityLabel('2026-10-31', '2026-10-31', false)).toBe('Today, October 31');
    expect(dayAccessibilityLabel('2026-10-24', '2026-10-31', false)).not.toMatch(/miss|streak|flame/i);
  });
});
