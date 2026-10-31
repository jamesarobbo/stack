import { TodayList } from '@/src/components/TodayList';
import { BackButton, Card, Screen, T } from '@/src/components/ui';
import { useApp } from '@/src/state';
import { useTheme } from '@/src/theme';

export default function TodayScreen() {
  const theme = useTheme();
  const app = useApp();
  return (
    <Screen>
      <BackButton />
      {app.reminders.length === 0 ? (
        <Card>
          <T weight="semibold" size={17}>
            Today
          </T>
          <T size={15} color={theme.muted}>
            Reminders are off. Add a time on a product when you want one.
          </T>
        </Card>
      ) : (
        <Card>
          <TodayList
            reminders={app.reminders}
            products={app.products}
            logs={app.logs}
            onToggle={(productId, day, taken) => void app.toggleTaken(productId, day, taken)}
          />
        </Card>
      )}
    </Screen>
  );
}
