import { TodayList } from '@/src/components/TodayList';
import { BackButton, Card, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state';

export default function TodayScreen() {
  const app = useApp();
  return (
    <Screen>
      <BackButton />
      <Card>
        <TodayList
          products={app.products}
          logs={app.logs}
          onToggle={(productId, day, taken) => void app.toggleTaken(productId, day, taken)}
          onAllTaken={(day) => void app.markAllTaken(day)}
        />
      </Card>
    </Screen>
  );
}
