import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { DateField } from '@/src/components/DateField';
import { DoseMeters } from '@/src/components/share';
import { UnitField } from '@/src/components/UnitField';
import { BackButton, Button, Card, Disclaimer, Screen, T } from '@/src/components/ui';
import { applyScreenExit } from '@/src/navigation/exit';
import { monthlyCostCents } from '@/src/domain/audit';
import { scoreProducts } from '@/src/domain/auditScore';
import { formatNumber, formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { font, theme } from '@/src/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const [priceText, setPriceText] = useState('');
  const product = app.products.find((item) => item.id === id);
  if (!product) {
    return (
      <Screen>
        <T weight="semibold">That product is gone.</T>
        <Button
          label="Back to stack"
          onPress={() => applyScreenExit(router.canGoBack(), () => router.back(), (href) => router.replace(href))}
        />
      </Screen>
    );
  }
  const monthly = monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay);
  const totals = scoreProducts([product]).totals;
  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={32} style={styles.title}>
        {product.name}
      </T>
      {product.brand ? (
        <T size={15} color={theme.muted}>
          {product.brand}
        </T>
      ) : null}
      {product.priceCents > 0 ? (
        <View style={{ gap: 2 }}>
          <T weight="bold" size={36} color={theme.amber} style={styles.price}>
            {formatUsd(monthly)}
          </T>
          <T size={14} color={theme.muted}>
            a month, from the price and servings you entered
          </T>
        </View>
      ) : null}
      {totals.length > 0 ? (
        <Card>
          <T weight="semibold" size={17}>
            Daily dose
          </T>
          <DoseMeters totals={totals} />
        </Card>
      ) : null}
      <Card>
        {product.priceCents <= 0 ? (
          <View style={{ gap: 8 }}>
            <T size={14} color={theme.muted}>
              Add the price you paid.
            </T>
            <TextInput
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Price you paid"
              style={styles.input}
            />
            <Button
              label="Save price"
              onPress={() => {
                const dollars = Number(priceText);
                if (Number.isFinite(dollars) && dollars > 0) void app.setPrice(product.id, Math.round(dollars * 100));
              }}
            />
          </View>
        ) : (
          <T size={14} color={theme.muted}>
            {`${formatUsd(product.priceCents)} for ${product.servingsPerContainer} servings, ${product.servingsPerDay} a day.`}
          </T>
        )}
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

const styles = StyleSheet.create({
  title: { letterSpacing: -0.8 },
  price: { letterSpacing: -1.2, lineHeight: 42 },
  input: {
    minHeight: 48,
    backgroundColor: theme.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: font.regular,
    color: theme.text,
  },
});
