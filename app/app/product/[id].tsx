import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { DateField } from '@/src/components/DateField';
import { useNumberPadField } from '@/src/components/NumberPadAccessory';
import { DoseMeters } from '@/src/components/share';
import { DoseRow } from '@/src/primitives';
import type { UnitOption } from '@/src/data/units';
import { BackButton, Button, Card, Disclaimer, Screen, T } from '@/src/components/ui';
import { applyScreenExit } from '@/src/navigation/exit';
import { monthlyCostCents } from '@/src/domain/audit';
import { scoreProducts } from '@/src/domain/auditScore';
import { formatUsDate } from '@/src/dates';
import { formatMoney } from '@/src/format';
import { currencyOf } from '../../../shared/money';
import { useApp } from '@/src/state';
import { control, font, radius, space, typeSize, useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function ProductScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const [editing, setEditing] = useState(false);
  const [priceText, setPriceText] = useState('');
  const [pricePadRef, pricePad] = useNumberPadField(`product-price-${id ?? 'x'}`);
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
  const priceCurrency = currencyOf(product);
  const monthly = monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay);
  const totals = scoreProducts([product]).totals;

  return (
    <Screen>
      <View style={styles.nav}>
        <BackButton />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Done' : 'Edit'}
          onPress={() => {
            if (!editing) setPriceText(product.priceCents > 0 ? (product.priceCents / 100).toFixed(2) : '');
            setEditing((v) => !v);
          }}
          hitSlop={8}
          style={styles.editBtn}
        >
          <T size={17} weight="semibold" color={theme.action}>
            {editing ? 'Done' : 'Edit'}
          </T>
        </Pressable>
      </View>

      <T weight="bold" size={32} style={styles.title}>
        {product.name}
      </T>
      {product.brand ? (
        <T size={15} color={theme.muted}>
          {product.brand}
        </T>
      ) : null}

      {product.priceCents > 0 ? (
        <View style={{ gap: space.xs }}>
          <T weight="bold" size={36} color={theme.amber} style={styles.price}>
            {formatMoney(monthly, priceCurrency)}
          </T>
          <T size={14} color={theme.muted}>
            a month, from the price and servings you entered
          </T>
        </View>
      ) : (
        <T size={15} color={theme.muted}>
          No price yet. Tap Edit to add what you paid.
        </T>
      )}

      {!editing ? (
        <>
          {product.ingredients.length > 0 ? (
            <Card>
              <T weight="semibold" size={17}>
                Daily dose
              </T>
              {product.ingredients.map((ingredient) => (
                <View key={`${ingredient.key}-${ingredient.name}`} style={styles.readRow}>
                  <T size={16} style={{ flex: 1 }}>
                    {ingredient.name}
                  </T>
                  <T size={16} weight="semibold" color={theme.muted}>
                    {ingredient.amount ? `${ingredient.amount} ${ingredient.unit}` : ingredient.unit}
                  </T>
                </View>
              ))}
            </Card>
          ) : null}
          {totals.length > 0 ? (
            <Card tone="sand">
              <DoseMeters totals={totals} />
            </Card>
          ) : null}
          <Card>
            <View style={styles.readRow}>
              <T size={16} color={theme.muted}>
                Start date
              </T>
              <T size={16} weight="semibold">
                {formatUsDate(product.startDate)}
              </T>
            </View>
            {product.priceCents > 0 ? (
              <T size={14} color={theme.muted}>
                {`${formatMoney(product.priceCents, priceCurrency)} for ${product.servingsPerContainer} servings, ${product.servingsPerDay} a day.`}
              </T>
            ) : null}
          </Card>
          <Button
            label="Remove from stack"
            kind="plain"
            onPress={async () => {
              await app.remove(product.id);
              router.back();
            }}
            style={{ alignSelf: 'center' }}
            fullWidth={false}
          />
        </>
      ) : (
        <>
          {totals.length > 0 ? (
            <Card>
              <T weight="semibold" size={17}>
                Daily dose
              </T>
              <DoseMeters totals={totals} />
            </Card>
          ) : null}
          <Card>
            {product.priceCents <= 0 || priceText !== '' ? (
              <View style={{ gap: space.sm }}>
                <T size={14} color={theme.muted}>
                  Price you paid
                </T>
                <TextInput
                  ref={pricePadRef}
                  value={priceText}
                  onChangeText={setPriceText}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  placeholder="0.00"
                  placeholderTextColor={theme.muted}
                  accessibilityLabel="Price you paid"
                  returnKeyType="done"
                  clearButtonMode="while-editing"
                  {...pricePad}
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
                {`${formatMoney(product.priceCents, priceCurrency)} for ${product.servingsPerContainer} servings, ${product.servingsPerDay} a day.`}
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
              <IngredientDose
                key={`${ingredient.key}-${ingredient.name}`}
                name={ingredient.name}
                amount={ingredient.amount}
                unit={ingredient.unit}
                onAmount={(amount) => {
                  if (amount !== ingredient.amount) void app.setIngredientAmount(product.id, ingredient.key, ingredient.name, amount);
                }}
                onUnit={(unit) => {
                  if (unit !== ingredient.unit) void app.setIngredientUnit(product.id, ingredient.key, ingredient.name, unit);
                }}
              />
            ))}
          </Card>
          <Button
            label="Remove from stack"
            kind="destructive"
            onPress={async () => {
              await app.remove(product.id);
              router.back();
            }}
          />
        </>
      )}
      <Disclaimer />
    </Screen>
  );
}

function IngredientDose({
  name,
  amount,
  unit,
  onAmount,
  onUnit,
}: {
  name: string;
  amount: number;
  unit: string;
  onAmount: (amount: number) => void;
  onUnit: (unit: UnitOption) => void;
}) {
  const [text, setText] = useState(amount ? String(amount) : '');
  const [padRef, pad] = useNumberPadField(`ingredient-amount-${name}`);
  return (
    <View style={{ gap: space.sm }}>
      <T size={14} weight="semibold">
        {name}
      </T>
      <DoseRow
        amount={text}
        onChangeAmount={setText}
        unit={unit}
        onChangeUnit={onUnit}
        accessibilityLabel={`${name} amount`}
        inputAccessoryViewID={pad.inputAccessoryViewID}
        onFocus={pad.onFocus}
        inputRef={padRef}
        onBlur={() => {
          pad.onBlur();
          const next = Number(text);
          if (!Number.isFinite(next) || next <= 0) {
            setText(amount ? String(amount) : '');
            return;
          }
          onAmount(next);
        }}
      />
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: control.height },
    editBtn: { minHeight: control.height, justifyContent: 'center', paddingHorizontal: space.sm },
    title: { letterSpacing: -0.8 },
    price: { letterSpacing: -1.2, lineHeight: 42 },
    readRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
      minHeight: control.height,
    },
    input: {
      height: control.height,
      minHeight: control.height,
      backgroundColor: theme.bg,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      fontSize: typeSize.body,
      fontWeight: font.regular,
      color: theme.text,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.line,
    },
  });
}
