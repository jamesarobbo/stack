import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { MonthCalendar } from '@/src/components/MonthCalendar';
import { BackButton, Card, Screen, T } from '@/src/components/ui';
import { localToday } from '@/src/dates';
import { useApp } from '@/src/state';
import { useTheme, useThemedStyles, type Theme } from '@/src/theme';
import { canAdvanceMonth, loggedStreak, monthParts, shiftMonth, streakLine } from '../../shared/reminders';

/** Read-only log history: streak and a month calendar of logged days. */
export default function HistoryScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const today = localToday();
  const initial = monthParts(today);
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });
  const loggedDays = useMemo(() => new Set(app.logs.map((log) => log.day)), [app.logs]);
  const streak = streakLine(loggedStreak(app.logs, today));
  const go = useCallback(
    (by: number) => {
      setCursor((current) => {
        if (by > 0 && !canAdvanceMonth(current.year, current.month, today)) return current;
        return shiftMonth(current.year, current.month, by);
      });
    },
    [today, setCursor],
  );
  const onPrevious = useCallback(() => go(-1), [go]);
  const onNext = useCallback(() => go(1), [go]);

  return (
    <Screen>
      <BackButton />
      <T weight="semibold" size={30} style={styles.title}>
        History
      </T>
      {streak ? (
        <T size={15} color={theme.muted}>
          {streak}
        </T>
      ) : (
        <T size={15} color={theme.muted}>
          No days logged yet
        </T>
      )}
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
    </Screen>
  );
}

function localStyles(_theme: Theme) {
  return StyleSheet.create({
    title: { letterSpacing: -0.6 },
  });
}
