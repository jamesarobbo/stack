import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { searchCatalogue, type CatalogueItem } from '@/src/data/catalogue';
import { localToday } from '@/src/dates';
import type { IngredientInput } from '@/src/domain/types';
import { useApp } from '@/src/state';
import { font, theme } from '@/src/theme';

export default function AddScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const initial = params.mode === 'manual' ? 'manual' : 'search';
  const [mode, setMode] = useState<'search' | 'manual'>(initial);
  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={30} style={styles.title}>
        Add a product
      </T>
      <View style={styles.switch}>
        <Pressable accessibilityRole="button" onPress={() => setMode('search')} style={[styles.switchItem, mode === 'search' && styles.switchOn]}>
          <T weight="semibold" size={14} color={mode === 'search' ? '#fff' : theme.text}>
            Search
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setMode('manual')} style={[styles.switchItem, mode === 'manual' && styles.switchOn]}>
          <T weight="semibold" size={14} color={mode === 'manual' ? '#fff' : theme.text}>
            Manual
          </T>
        </Pressable>
      </View>
      {mode === 'search' ? <SearchAdd /> : <ManualAdd />}
    </Screen>
  );
}

function SearchAdd() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(localToday());
  const results = useMemo(() => searchCatalogue(query).slice(0, 30), [query]);
  const owned = new Set(app.products.map((product) => product.catalogueId).filter(Boolean));
  return (
    <View style={{ gap: 12 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="NMN, TMG, magnesium…"
        placeholderTextColor={theme.faint}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date YYYY-MM-DD" placeholderTextColor={theme.faint} style={styles.input} />
      <T size={12} color={theme.muted}>
        Amounts are examples from a fictional label, not a suggestion. The start date is the day you want the before/after window to use.
      </T>
      {results.map((item) => (
        <CatalogueRow
          key={item.id}
          item={item}
          added={owned.has(item.id)}
          onAdd={async () => {
            await app.addFromCatalogue(item, startDate || localToday());
          }}
        />
      ))}
    </View>
  );
}

function CatalogueRow({ item, added, onAdd }: { item: CatalogueItem; added: boolean; onAdd: () => void }) {
  const amount = item.ingredients.map((ingredient) => `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`).join(', ');
  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <T weight="semibold">{item.name}</T>
          <T size={13} color={theme.muted}>
            {`${item.brand} · ${amount}`}
          </T>
        </View>
        <Pressable accessibilityRole="button" disabled={added} onPress={onAdd}>
          <T weight="semibold" color={added ? theme.faint : theme.teal}>
            {added ? 'Added' : 'Add'}
          </T>
        </Pressable>
      </View>
    </Card>
  );
}

function ManualAdd() {
  const app = useApp();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [servings, setServings] = useState('30');
  const [perDay, setPerDay] = useState('1');
  const [startDate, setStartDate] = useState(localToday());
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { key: '', name: '', amount: 0, unit: 'mg', costWeight: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<IngredientInput>) {
    setIngredients((current) => current.map((ingredient, i) => (i === index ? { ...ingredient, ...patch } : ingredient)));
  }

  return (
    <View style={{ gap: 10 }}>
      <Field label="Product" value={name} onChangeText={setName} placeholder="What the bottle says" />
      <Field label="Price (USD)" value={price} onChangeText={setPrice} placeholder="29.00" keyboard="decimal-pad" />
      <Field label="Servings per container" value={servings} onChangeText={setServings} keyboard="number-pad" />
      <Field label="Servings per day" value={perDay} onChangeText={setPerDay} keyboard="decimal-pad" />
      <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
      <T weight="semibold">Ingredients on the label</T>
      {ingredients.map((ingredient, index) => (
        <Card key={index}>
          <Field label="Name" value={ingredient.name} onChangeText={(value) => update(index, { name: value, key: slug(value) })} placeholder="Magnesium" />
          <Field
            label="Amount"
            value={ingredient.amount ? String(ingredient.amount) : ''}
            onChangeText={(value) => update(index, { amount: Number(value) || 0 })}
            keyboard="decimal-pad"
          />
          <Field label="Unit" value={ingredient.unit} onChangeText={(value) => update(index, { unit: value })} placeholder="mg, mcg, IU, g" />
        </Card>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setIngredients((current) => [...current, { key: '', name: '', amount: 0, unit: 'mg', costWeight: 1 }])}
      >
        <T weight="semibold" color={theme.teal}>
          Add another ingredient
        </T>
      </Pressable>
      {error ? (
        <T size={13} color={theme.flagText}>
          {error}
        </T>
      ) : null}
      <Button
        label="Save product"
        onPress={async () => {
          const priceCents = Math.round(Number(price) * 100);
          const servingsPerContainer = Number(servings);
          const servingsPerDay = Number(perDay);
          const cleaned = ingredients.filter((ingredient) => ingredient.name.trim() && ingredient.amount > 0);
          if (!name.trim() || !Number.isFinite(priceCents) || priceCents <= 0) {
            setError('Add a product name and a price.');
            return;
          }
          if (!Number.isFinite(servingsPerContainer) || servingsPerContainer <= 0 || !Number.isFinite(servingsPerDay) || servingsPerDay <= 0) {
            setError('Servings need to be numbers above zero.');
            return;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            setError('Use a start date like 2026-10-01.');
            return;
          }
          if (cleaned.length === 0) {
            setError('Add at least one ingredient and the amount on the label.');
            return;
          }
          await app.addManual({
            name: name.trim(),
            priceCents,
            servingsPerContainer,
            servingsPerDay,
            startDate,
            ingredients: cleaned.map((ingredient) => ({ ...ingredient, costWeight: 1 })),
          });
          router.back();
        }}
      />
      <T size={12} color={theme.muted}>
        This records what you typed. It does not calculate a dose.
      </T>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboard?: 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={{ gap: 4 }}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.faint} keyboardType={keyboard} style={styles.input} />
    </View>
  );
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ingredient';
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6 },
  switch: { flexDirection: 'row', backgroundColor: '#E7E9EE', borderRadius: 12, padding: 4 },
  switchItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  switchOn: { backgroundColor: theme.teal },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: theme.text,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
