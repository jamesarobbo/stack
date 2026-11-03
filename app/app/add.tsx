import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useNumberPadField } from '@/src/components/NumberPadAccessory';
import { DateField } from '@/src/components/DateField';
import { NativeSegmented } from '@/src/components/NativeSegmented';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { DoseRow } from '@/src/primitives';
import { COMMON_INGREDIENTS, type CommonIngredient } from '@/src/data/commonIngredients';
import {
  BARCODE_NOT_FOUND,
  getDsldLabel,
  lookupUpc,
  OFF_ATTRIBUTION,
  OFF_DOSE_PROMPT,
  saveUserLabel,
  searchLabels,
  type LabelHit,
  type RemoteLabel,
} from '@/src/data/labels';
import { DEFAULT_UNIT, type UnitOption } from '@/src/data/units';
import { clampStartDate, localToday } from '@/src/dates';
import { humanProductNote } from '@/src/productSubtitle';
import type { IngredientInput } from '@/src/domain/types';
import { ApiError } from '@/src/api';
import { priceFieldLabel } from '../../shared/money';
import { useApp } from '@/src/state';
import { fontFamily, control, font, radius, space, typeSize, useTheme, useThemedStyles, type Theme } from '@/src/theme';

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function AddScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const params = useLocalSearchParams<{ mode?: string; upc?: string; dsld?: string }>();
  const initialMode = one(params.mode) === 'manual' ? 'manual' : 'search';
  const [mode, setMode] = useState<'search' | 'manual'>(initialMode);
  const [seed, setSeed] = useState<CommonIngredient | null>(null);
  const [barcode, setBarcode] = useState(one(params.upc));
  const [prefill, setPrefill] = useState<RemoteLabel | null>(null);
  const [offDraft, setOffDraft] = useState<RemoteLabel | null>(null);
  const [loadingLabel, setLoadingLabel] = useState(() => Boolean(one(params.dsld) || one(params.upc)));
  const [labelError, setLabelError] = useState<string | null>(null);

  useEffect(() => {
    const dsld = one(params.dsld);
    const upc = one(params.upc);
    if (!dsld && !upc) return;
    let cancel = false;
    const timer = setTimeout(() => {
      if (cancel) return;
      setLoadingLabel(true);
      setLabelError(null);
      setPrefill(null);
      setOffDraft(null);
      const job = dsld
        ? getDsldLabel(dsld).then((result) => result.label)
        : lookupUpc(upc, app.sessionToken).then((result) => {
            if (!result.found || !result.label) {
              if (!cancel) {
                setMode('manual');
                setBarcode(result.upc || upc);
                setLabelError(BARCODE_NOT_FOUND);
              }
              return null;
            }
            if (result.label.source === 'off') {
              if (!cancel) {
                setMode('manual');
                setBarcode(result.label.upc || result.upc || upc);
                setOffDraft(result.label);
              }
              return null;
            }
            return result.label;
          });
      void job
        .then((label) => {
          if (!cancel && label) setPrefill(label);
        })
        .catch((error: unknown) => {
          if (cancel) return;
          setLabelError(error instanceof ApiError ? error.message : 'The label could not be loaded.');
          if (upc) setMode('manual');
        })
        .finally(() => {
          if (!cancel) setLoadingLabel(false);
        });
    }, 0);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [app.sessionToken, params.dsld, params.upc]);

  return (
    <Screen>
      <BackButton />
      <T weight="semibold" size={30} style={styles.title}>
        Add a product
      </T>
      {prefill ? (
        <Prefill label={prefill} onClear={() => setPrefill(null)} />
      ) : offDraft ? (
        <ManualAdd barcode={barcode} onBarcode={setBarcode} seed={null} off={offDraft} onClearOff={() => setOffDraft(null)} />
      ) : (
        <>
          <Button label="Scan a barcode" onPress={() => router.push('/scan')} />
          <NativeSegmented
            items={[
              { key: 'search', label: 'Search' },
              { key: 'manual', label: 'Manual' },
            ]}
            value={mode}
            onChange={setMode}
          />
          {loadingLabel ? (
            <T size={14} color={theme.muted}>
              Looking up that label...
            </T>
          ) : null}
          {labelError ? (
            <T size={13} color={theme.flagText}>
              {labelError}
            </T>
          ) : null}
          {mode === 'search' ? (
            <SearchAdd
              onPick={setPrefill}
              onManual={(ingredient) => {
                setSeed(ingredient);
                setMode('manual');
              }}
            />
          ) : (
            <ManualAdd barcode={barcode} onBarcode={setBarcode} seed={seed} off={null} onClearOff={null} />
          )}
        </>
      )}
    </Screen>
  );
}

function SearchAdd({ onPick, onManual }: { onPick: (label: RemoteLabel) => void; onManual: (ingredient: CommonIngredient | null) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<LabelHit[]>([]);
  const [attribution, setAttribution] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancel = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchLabels(q)
        .then((result) => {
          if (cancel) return;
          setHits(result.hits);
          setAttribution(result.attribution);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (cancel) return;
          setHits([]);
          setError(reason instanceof ApiError ? reason.message : 'Label search is offline. Type the bottle in, or start from a common ingredient.');
        })
        .finally(() => {
          if (!cancel) setSearching(false);
        });
    }, 300);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={{ gap: space.md }}>
      <TextInput
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          if (value.trim().length < 2) {
            setHits([]);
            setError(null);
            setSearching(false);
          }
        }}
        placeholder="Magnesium, vitamin D, brand"
        placeholderTextColor={theme.faint}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <T size={12} color={theme.muted}>
        Search uses the NIH Dietary Supplement Label Database. You still enter the price and the start date. Amounts are what the label says, not a suggestion.
      </T>
      {searching ? (
        <T size={13} color={theme.muted}>
          Searching labels...
        </T>
      ) : null}
      {error ? (
        <T size={13} color={theme.flagText}>
          {error}
        </T>
      ) : null}
      {hits.map((hit) => (
        <Card key={hit.dsldId}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpening(hit.dsldId);
              void getDsldLabel(hit.dsldId)
                .then((result) => onPick(result.label))
                .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'That label could not be opened.'))
                .finally(() => setOpening(null));
            }}
          >
            <T weight="semibold">{hit.name}</T>
            <T size={13} color={theme.muted}>
              {hit.brand || 'Brand not listed'}
              {hit.keyIngredients.length > 0 ? ` · ${hit.keyIngredients.join(', ')}` : ''}
            </T>
            {opening === hit.dsldId ? (
              <T size={12} color={theme.action}>
                Opening label...
              </T>
            ) : null}
          </Pressable>
        </Card>
      ))}
      {query.trim().length >= 2 && !searching && hits.length === 0 && !error ? (
        <T size={14} color={theme.muted}>
          No labels matched. Try the brand, or add it by hand.
        </T>
      ) : null}
      {attribution && hits.length > 0 ? (
        <T size={13} color={theme.muted}>
          {attribution}
        </T>
      ) : null}
      <T weight="semibold">Common ingredients</T>
      <T size={12} color={theme.muted}>
        These stay on the phone for when search is offline. They are names only. You type the amount.
      </T>
      <View style={styles.chips}>
        {COMMON_INGREDIENTS.map((ingredient) => (
          <IngredientChip key={ingredient.key} name={ingredient.name} onPress={() => onManual(ingredient)} />
        ))}
      </View>
    </View>
  );
}

function Prefill({ label, onClear }: { label: RemoteLabel; onClear: () => void }) {
  const theme = useTheme();
  const app = useApp();
  const [price, setPrice] = useState('');
  const [servings, setServings] = useState(String(label.servingsPerContainer));
  const [perDay, setPerDay] = useState(String(label.servingsPerDay));
  const [startDate, setStartDate] = useState(localToday());
  const [error, setError] = useState<string | null>(null);
  const catalogueId = label.dsldId ? `dsld:${label.dsldId}` : label.upc ? `upc:${label.upc}` : null;
  const owned = catalogueId ? app.products.some((product) => product.catalogueId === catalogueId) : false;

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <T weight="semibold">{label.name}</T>
        <T size={13} color={theme.muted}>
          {label.brand || 'Brand not listed'}
          {label.upc ? ` · ${label.upc}` : ''}
        </T>
        <T size={13} color={theme.muted}>
          {`Serving size ${label.servingSize}.`}
        </T>
        {label.ingredients.map((ingredient) => (
          <T key={`${ingredient.key}-${ingredient.name}`} size={14}>
            {`${ingredient.name} · ${ingredient.amount} ${ingredient.unit}`}
          </T>
        ))}
        <T size={13} color={theme.muted}>
          {label.dsldId
            ? `Amounts from NIH DSLD ${label.dsldId}. You can change a unit after saving.`
            : 'You entered this label. It is saved for your account when you are signed in.'}
        </T>
      </Card>
      {!label.servingsCounted ? (
        <T size={13} color={theme.muted}>
          DSLD did not list a serving count, so 30 is a placeholder. Check the bottle.
        </T>
      ) : null}
      <Field label={priceFieldLabel(app.currency)} value={price} onChangeText={setPrice} placeholder="29.00" keyboard="decimal-pad" padId="prefill-price" />
      <Field label="Servings per container" value={servings} onChangeText={setServings} keyboard="number-pad" padId="prefill-servings" />
      <Field label="Servings per day" value={perDay} onChangeText={setPerDay} keyboard="decimal-pad" padId="prefill-per-day" />
      <DateField label="Start date" value={startDate} onChange={setStartDate} />
      {owned ? (
        <T size={13} color={theme.flagText}>
          This label is already in your stack.
        </T>
      ) : null}
      {error ? (
        <T size={13} color={theme.flagText}>
          {error}
        </T>
      ) : null}
      <Button
        label="Save product"
        disabled={owned}
        onPress={async () => {
          const priceCents = Math.round(Number(price) * 100);
          const servingsPerContainer = Number(servings);
          const servingsPerDay = Number(perDay);
          if (!Number.isFinite(priceCents) || priceCents <= 0) {
            setError('Add the price you paid.');
            return;
          }
          if (!Number.isFinite(servingsPerContainer) || servingsPerContainer <= 0 || !Number.isFinite(servingsPerDay) || servingsPerDay <= 0) {
            setError('Servings need to be numbers above zero.');
            return;
          }
          const note = humanProductNote({ brand: label.brand, servingSize: label.servingSize });
          await app.addManual({
            name: label.name,
            brand: label.brand || null,
            note,
            priceCents,
            servingsPerContainer,
            servingsPerDay,
            startDate: clampStartDate(startDate),
            catalogueId,
            ingredients: label.ingredients.map((ingredient) => ({ ...ingredient, costWeight: 1 })),
          });
          router.back();
        }}
      />
      <Pressable accessibilityRole="button" onPress={onClear}>
        <T weight="semibold" color={theme.action}>
          Choose a different label
        </T>
      </Pressable>
    </View>
  );
}

function ManualAdd({
  barcode,
  onBarcode,
  seed,
  off,
  onClearOff,
}: {
  barcode: string;
  onBarcode: (value: string) => void;
  seed: CommonIngredient | null;
  off: RemoteLabel | null;
  onClearOff: (() => void) | null;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const [name, setName] = useState(off?.name ?? '');
  const [brand, setBrand] = useState(off?.brand ?? '');
  const [price, setPrice] = useState('');
  const [servings, setServings] = useState(off?.servingsCounted ? String(off.servingsPerContainer) : '30');
  const [perDay, setPerDay] = useState(off ? String(off.servingsPerDay || 1) : '1');
  const [startDate, setStartDate] = useState(localToday());
  const [ingredients, setIngredients] = useState<IngredientInput[]>(initialIngredients(off, seed));
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<IngredientInput>) {
    setIngredients((current) => current.map((ingredient, i) => (i === index ? { ...ingredient, ...patch } : ingredient)));
  }

  function addCommon(ingredient: CommonIngredient) {
    setIngredients((current) => {
      if (current.some((row) => row.key === ingredient.key && row.name === ingredient.name)) return current;
      const empty = current.length === 1 && !current[0]?.name && !current[0]?.amount;
      const next = { key: ingredient.key, name: ingredient.name, amount: 0, unit: ingredient.unit, costWeight: 1 };
      return empty ? [next] : [...current, next];
    });
  }

  const servingNote = off && off.servingSize && off.servingSize !== '1 serving' ? off.servingSize : '';

  return (
    <View style={{ gap: space.md }}>
      {off ? (
        <View style={styles.notice}>
          <T weight="semibold">{OFF_DOSE_PROMPT}</T>
        </View>
      ) : null}
      {off ? (
        <T size={13} color={theme.muted}>
          {OFF_ATTRIBUTION}
        </T>
      ) : null}
      {servingNote ? (
        <T size={13} color={theme.muted}>
          {`Serving size from the lookup: ${servingNote}.`}
        </T>
      ) : null}
      {off && !off.servingsCounted ? (
        <T size={13} color={theme.muted}>
          Serving count was not on the lookup, so 30 is a placeholder. Check the bottle.
        </T>
      ) : null}
      <Field label="Product" value={name} onChangeText={setName} placeholder="What the bottle says" />
      {off ? <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Brand on the bottle" /> : null}
      <Field label="Barcode (optional)" value={barcode} onChangeText={onBarcode} placeholder="088395056116" keyboard="number-pad" padId="manual-barcode" />
      <Field label={priceFieldLabel(app.currency)} value={price} onChangeText={setPrice} placeholder="29.00" keyboard="decimal-pad" padId="manual-price" />
      <Field label="Servings per container" value={servings} onChangeText={setServings} keyboard="number-pad" padId="manual-servings" />
      <Field label="Servings per day" value={perDay} onChangeText={setPerDay} keyboard="decimal-pad" padId="manual-per-day" />
      <DateField label="Start date" value={startDate} onChange={setStartDate} />
      <T weight="semibold">Ingredients on the label</T>
      <View style={styles.chips}>
        {COMMON_INGREDIENTS.map((ingredient) => (
          <IngredientChip key={ingredient.key} name={ingredient.name} onPress={() => addCommon(ingredient)} />
        ))}
      </View>
      {ingredients.map((ingredient, index) => (
        <Card key={`${ingredient.key}-${index}`}>
          <Field label="Name" value={ingredient.name} onChangeText={(value) => update(index, { name: value, key: slug(value) })} placeholder="Magnesium" />
          <DoseAmountRow
            id={`dose-${index}-${ingredient.key || ingredient.name || 'row'}`}
            amount={ingredient.amount ? String(ingredient.amount) : ''}
            onAmountText={(value) => update(index, { amount: Number(value) || 0 })}
            unit={ingredient.unit}
            onUnit={(unit) => update(index, { unit })}
          />
        </Card>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setIngredients((current) => [...current, { key: '', name: '', amount: 0, unit: DEFAULT_UNIT, costWeight: 1 }])}
      >
        <T weight="semibold" color={theme.action}>
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
          const digits = barcode.replace(/\D/g, '');
          if (!name.trim() || !Number.isFinite(priceCents) || priceCents <= 0) {
            setError('Add a product name and a price.');
            return;
          }
          if (!Number.isFinite(servingsPerContainer) || servingsPerContainer <= 0 || !Number.isFinite(servingsPerDay) || servingsPerDay <= 0) {
            setError('Servings need to be numbers above zero.');
            return;
          }
          if (cleaned.length === 0) {
            setError('Add at least one ingredient and the amount on the label.');
            return;
          }
          if (barcode.trim() && (digits.length < 8 || digits.length > 14)) {
            setError('A barcode needs 8 to 14 digits, or leave it blank.');
            return;
          }
          const brandName = brand.trim();
          await app.addManual({
            name: name.trim(),
            brand: brandName || null,
            priceCents,
            servingsPerContainer,
            servingsPerDay,
            startDate: clampStartDate(startDate),
            catalogueId: digits ? `${off ? 'off' : 'upc'}:${digits}` : null,
            note: productNote(digits, off),
            ingredients: cleaned.map((ingredient) => ({ ...ingredient, costWeight: 1 })),
          });
          if (digits && app.sessionToken) {
            const remote: RemoteLabel = {
              dsldId: null,
              name: name.trim(),
              brand: brandName,
              upc: digits,
              servingSize: off?.servingSize || '1 serving',
              servingsPerContainer,
              servingsPerDay,
              servingsCounted: true,
              source: 'user',
              ingredients: cleaned.map((ingredient) => ({
                key: ingredient.key,
                name: ingredient.name,
                amount: ingredient.amount,
                unit: ingredient.unit,
                costWeight: 1,
              })),
            };
            try {
              await saveUserLabel(remote, app.sessionToken);
            } catch {
              // The product is already on this device. Account reuse can wait.
            }
          }
          router.back();
        }}
      />
      {off && onClearOff ? (
        <Pressable accessibilityRole="button" onPress={onClearOff}>
          <T weight="semibold" color={theme.action}>
            Clear this lookup
          </T>
        </Pressable>
      ) : null}
      <T size={12} color={theme.muted}>
        This records what you typed. It does not calculate a dose. Sign in to reuse a barcode you entered.
      </T>
    </View>
  );
}

function initialIngredients(off: RemoteLabel | null, seed: CommonIngredient | null): IngredientInput[] {
  if (off && off.ingredients.length > 0) {
    return off.ingredients.map((ingredient) => ({
      key: ingredient.key,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      costWeight: 1,
    }));
  }
  if (seed) return [{ key: seed.key, name: seed.name, amount: 0, unit: seed.unit, costWeight: 1 }];
  return [{ key: '', name: '', amount: 0, unit: DEFAULT_UNIT, costWeight: 1 }];
}

function productNote(_digits: string, off: RemoteLabel | null): string | null {
  return humanProductNote({ brand: off?.brand, servingSize: off?.servingSize });
}


function DoseAmountRow({
  id,
  amount,
  onAmountText,
  unit,
  onUnit,
}: {
  id: string;
  amount: string;
  onAmountText: (value: string) => void;
  unit: string;
  onUnit: (unit: UnitOption) => void;
}) {
  const [padRef, pad] = useNumberPadField(id, true);
  return (
    <DoseRow
      amount={amount}
      onChangeAmount={onAmountText}
      unit={unit}
      onChangeUnit={onUnit}
      accessibilityLabel="Amount"
      inputRef={padRef}
      inputAccessoryViewID={pad.inputAccessoryViewID}
      onFocus={pad.onFocus}
      onBlur={pad.onBlur}
      placeholder="Amount"
    />
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  padId,
  returnKeyType = 'done',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboard?: 'decimal-pad' | 'number-pad';
  /** Stable id when this field uses a number pad (prev/next + Done accessory). */
  padId?: string;
  returnKeyType?: 'done' | 'next';
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const usePad = Boolean(keyboard);
  const [padRef, pad] = useNumberPadField(padId ?? `field-${label}`, usePad);
  return (
    <View style={{ gap: space.sm }}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <TextInput
        ref={usePad ? padRef : undefined}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        keyboardType={keyboard}
        inputMode={keyboard === 'decimal-pad' ? 'decimal' : keyboard === 'number-pad' ? 'numeric' : undefined}
        returnKeyType={keyboard ? 'done' : returnKeyType}
        clearButtonMode="while-editing"
        {...(usePad ? pad : null)}
        style={styles.input}
      />
    </View>
  );
}

function IngredientChip({ name, onPress }: { name: string; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed ? { opacity: 0.88 } : null]}
    >
      <Ionicons name="add" size={16} color={theme.action} />
      <T size={15} weight="semibold" color={theme.action}>
        {name}
      </T>
    </Pressable>
  );
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ingredient';
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.6 },
  input: {
    height: control.height,
    minHeight: control.height,
    backgroundColor: theme.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: space.md,
    fontSize: typeSize.body,
    fontFamily, fontWeight: font.regular,
    color: theme.text,
  },
  notice: {
    backgroundColor: theme.amberBg,
    borderColor: theme.amberBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: control.height,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: theme.sand,
    borderWidth: 1,
    borderColor: theme.action,
  },
});
}

