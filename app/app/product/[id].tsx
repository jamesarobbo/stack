import { router, useLocalSearchParams } from 'expo-router';
import { BackButton, Button, Card, Disclaimer, ProductRow, Screen, T } from '@/src/components/ui';
import { monthlyCostCents } from '@/src/domain/audit';
import { formatNumber, formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const product = app.products.find((item) => item.id === id);
  if (!product) {
    return (
      <Screen>
        <T weight="semibold">That product is gone.</T>
        <Button label="Back to stack" onPress={() => router.back()} />
      </Screen>
    );
  }
  const monthly = monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay);
  return (
    <Screen>
      <BackButton />
      <ProductRow product={product} />
      <Card>
        <T size={14} color={theme.muted}>
          {`Monthly cost ${formatUsd(monthly)} from ${formatUsd(product.priceCents)} / ${product.servingsPerContainer} servings × ${product.servingsPerDay} a day × 30.`}
        </T>
        <T size={14} color={theme.muted}>
          {`Start date ${product.startDate}`}
        </T>
        {product.ingredients.map((ingredient) => (
          <T key={`${ingredient.key}-${ingredient.name}`} size={14}>
            {`${ingredient.name} · ${formatNumber(ingredient.amount, ingredient.amount < 1 ? 1 : 0)} ${ingredient.unit}`}
          </T>
        ))}
      </Card>
      <Button
        label="Remove from stack"
        tone="ghost"
        onPress={async () => {
          await app.remove(product.id);
          router.back();
        }}
      />
      <Disclaimer />
    </Screen>
  );
}
