import { useCallback, useMemo, useState } from 'react';
import { MonthCalendar } from '@/src/components/MonthCalendar';
import { TodayList } from '@/src/components/TodayList';
import { BackButton, Card, Screen, T } from '@/src/components/ui';
import { localToday } from '@/src/dates';
import { useApp } from '@/src/state';
import { useTheme } from '@/src/theme';
import { canAdvanceMonth, monthParts, shiftMonth } from '../../shared/reminders';

/**
 * Check-in always logs the device's local today.
 * The calendar is a read-only history of past logged days.
 */
export default function TodayScreen() {
  const theme = useTheme();
  const app = useApp();
  const today = localToday();
  const initial = monthParts(today);
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });
  const loggedDays = useMemo(() => new Set(app.logs.map((log) => log.day)), [app.logs]);
  const go = useCallback(
    (by: number) => {
      setCursor((current) => {
        if (by > 0 && !canAdvanceMonth(current.year, current.month, today)) return current;
        return shiftMonth(current.year, current.month, by);
      });
    },
    [today],
  );
  const onPrevious = useCallback(() => go(-1), [go]);
  const onNext = useCallback(() => go(1), [go]);

  return (
    <Screen>
      <BackButton />
      <Card>
        <T size={13} color={theme.muted}>
          Logged days
        </T>
        <MonthCalendar
          today={today}
          year={cursor.year}
          month={cursor.month}
          loggedDays={loggedDays}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </Card>
      <Card>
        <TodayList
          products={app.products}
          logs={app.logs}
          onToggle={(productId, _day, taken) => void app.toggleTaken(productId, today, taken)}
          onAllTaken={() => void app.markAllTaken(today)}
        />
      </Card>
    </Screen>
  );
}
