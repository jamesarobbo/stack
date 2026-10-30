import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { DateField } from '@/src/components/DateField';
import { UnitField } from '@/src/components/UnitField';
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
        <DateField
          label="Start date"
          value={product.startDate}
          onChange={(iso) => {
            if (iso !== product.startDate) void app.setStartDate(product.id, iso);
          }}
        />
        {product.ingredients.map((ingredient) => (
          <View key={`${ingredient.key}-${ingredient.name}`} style={{ gap: 6 }}>
            <T size={14} weight="semibold">
              {ingredient.name}
            </T>
            <T size={13} color={theme.muted}>
              {formatNumber(ingredient.amount, ingredient.amount < 1 ? 1 : 0)}
            </T>
            <UnitField
              value={ingredient.unit}
              onChange={(unit) => {
                if (unit !== ingredient.unit) void app.setIngredientUnit(product.id, ingredient.key, ingredient.name, unit);
              }}
            />
          </View>
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
