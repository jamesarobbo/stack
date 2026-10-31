import { useCallback, useMemo, useState } from 'react';
import { MonthCalendar } from '@/src/components/MonthCalendar';
import { TodayList } from '@/src/components/TodayList';
import { BackButton, Card, Screen } from '@/src/components/ui';
import { localToday } from '@/src/dates';
import { useApp } from '@/src/state';
import { canAdvanceMonth, monthParts, shiftMonth } from '../../shared/reminders';

export default function TodayScreen() {
  const app = useApp();
  const today = localToday();
  const initial = monthParts(today);
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });
  const [selected, setSelected] = useState(today);
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
        <MonthCalendar
          today={today}
          year={cursor.year}
          month={cursor.month}
          selected={selected}
          loggedDays={loggedDays}
          onSelect={setSelected}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <TodayList
          products={app.products}
          logs={app.logs}
          day={selected}
          onToggle={(productId, day, taken) => void app.toggleTaken(productId, day, taken)}
          onAllTaken={(day) => void app.markAllTaken(day)}
        />
      </Card>
    </Screen>
  );
}
