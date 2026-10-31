import { describe, expect, it } from 'vitest';
import { DAILY_REMINDER_TEXT, loggedStreak, streakLine, type IntakeLog } from './reminders';

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
