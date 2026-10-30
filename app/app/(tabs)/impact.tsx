import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart } from '@/src/components/BarChart';
import { Button, Card, Disclaimer, Eyebrow, Pill, Screen, T } from '@/src/components/ui';
import { ASSOCIATION } from '@/src/config';
import { GO_TO_STACK_LABEL, STACK_TAB_HREF } from '@/src/copy/labels';
import { auditStack, productWastedCents } from '@/src/domain/audit';
import { IMPACT_EMPTY, freshStartGaps } from '@/src/domain/emptyStates';
import {
  associationSentence,
  compareMetric,
  confoundersForWindow,
  signalStrength,
  verdictFor,
} from '@/src/domain/impact';
import { signed } from '@/src/format';
import { currentWearableEmptyCopy } from '@/src/health/runtime';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function ImpactScreen() {
  const app = useApp();
  const gaps = freshStartGaps({ products: app.products.length, wearableSamples: app.samples.length });
  const initial = app.products[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(initial);
  const [connectNote, setConnectNote] = useState<string | null>(null);
  const product = app.products.find((item) => item.id === selectedId) ?? app.products[0];
  const audit = useMemo(() => auditStack(app.products), [app.products]);

  if (!product || gaps.includes('wearable')) {
    const needsProduct = gaps.includes('products');
    return (
      <Screen>
        <Eyebrow left="Wearable impact" />
        <T weight="bold" size={32} style={styles.title}>
          {needsProduct ? IMPACT_EMPTY.productsTitle : IMPACT_EMPTY.wearableTitle}
        </T>
        <T size={15} color={theme.muted}>
          {needsProduct ? IMPACT_EMPTY.productsBody : IMPACT_EMPTY.wearableBody}
        </T>
        <T size={15} color={theme.muted}>
          {currentWearableEmptyCopy()}
        </T>
        {needsProduct ? (
          <Pressable accessibilityRole="link" onPress={() => router.navigate(STACK_TAB_HREF)}>
            <T weight="semibold" color={theme.teal}>
              {GO_TO_STACK_LABEL}
            </T>
          </Pressable>
        ) : null}
        <Button
          label="Connect Apple Health"
          tone={needsProduct ? 'ghost' : 'teal'}
          onPress={() => {
            void app.connectWearable().then(setConnectNote);
          }}
        />
        {connectNote ? (
          <T size={14} color={theme.muted}>
            {connectNote}
          </T>
        ) : null}
      </Screen>
    );
  }

  const sleep = compareMetric(app.samples, 'deep_sleep_min', product.startDate);
  const hrv = compareMetric(app.samples, 'hrv_sdnn_ms', product.startDate);
  const rhr = compareMetric(app.samples, 'resting_hr_bpm', product.startDate);
  const confounders = confoundersForWindow(app.samples, app.tags, product.startDate);
  const signal = signalStrength({
    daysBaseline: sleep.baseline.days,
    daysAfter: sleep.after.days,
    deepSleepDelta: sleep.delta,
    hrvDelta: hrv.delta,
    rhrDelta: rhr.delta,
  });
  const verdict = verdictFor({
    signal,
    wastedCents: productWastedCents(product.id, audit),
    confounderHeavy: confounders.heavy,
  });
  const source = app.healthSource === 'healthkit' ? 'Apple Health' : app.usingSampleData ? 'Example wearable data' : 'Wearable days on this device';

  return (
    <Screen>
      <Eyebrow left="Wearable impact" right={app.usingSampleData ? 'Example data' : undefined} />
      <T weight="bold" size={32} style={styles.title}>
        {product.name}
      </T>
      <T size={14} color={theme.muted}>
        {`21-day baseline → 21 days after · ${source}`}
      </T>
      <Pill tone="teal">{ASSOCIATION}</Pill>

      <View style={styles.stats}>
        <Stat label="Deep sleep" value={sleep.after.mean == null ? '-' : formatHours(sleep.after.mean)} delta={sleep.delta} deltaLabel={sleep.delta == null ? 'No days' : `${signed(sleep.delta)} vs baseline`} tone="teal" />
        <Stat label="HRV (SDNN)" value={hrv.after.mean == null ? '-' : `${Math.round(hrv.after.mean)} ms`} delta={hrv.delta} deltaLabel={hrv.delta == null ? 'No days' : `${signed(hrv.delta)} ms`} tone="teal" />
        <Stat label="Resting HR" value={rhr.after.mean == null ? '-' : `${Math.round(rhr.after.mean)}`} delta={rhr.delta == null ? null : -rhr.delta} deltaLabel={rhr.delta == null ? 'No days' : `${signed(rhr.delta)} bpm`} tone="blue" />
      </View>

      <BarChart title="Deep sleep (hrs / night)" baseline={sleep.baseline.series.map((value) => value / 60)} after={sleep.after.series.map((value) => value / 60)} />

      {app.isPro ? (
        <Card>
          <T weight="semibold" size={16}>
            Confounders accounted for
          </T>
          <View style={styles.chips}>
            <Chip label={confounders.trainingLoadSimilar == null ? 'Training load unknown' : confounders.trainingLoadSimilar ? 'Training load ≈' : 'Training load shifted'} />
            <Chip label={`Alcohol days flagged · ${confounders.alcoholDays}`} />
            <Chip label={confounders.travelDays === 0 ? 'No travel weeks' : `Travel days flagged · ${confounders.travelDays}`} />
          </View>
          <View style={styles.tagRow}>
            <TagButton label="Alcohol today" onPress={() => app.logTag('alcohol')} />
            <TagButton label="Travel today" onPress={() => app.logTag('travel')} />
            <TagButton label="Hard training" onPress={() => app.logTag('hard_training')} />
          </View>
        </Card>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')}>
          <Card>
            <T weight="semibold" size={16}>
              Confounder notes are part of Pro
            </T>
            <T size={14} color={theme.muted}>
              Training load, alcohol tags, and travel stay off the free before/after. The numbers above use every day in the window.
            </T>
            <T weight="semibold" color={theme.teal}>
              See Pro
            </T>
          </Card>
        </Pressable>
      )}

      <Card>
        <T size={14}>{associationSentence(product.name, sleep.delta)}</T>
        <T size={13} color={theme.muted}>
          {`Report label for this window: ${verdict}. That is a description of your logged data, not advice to start or stop anything.`}
        </T>
      </Card>

      {app.products.length > 1 ? (
        <View style={{ gap: 8 }}>
          <T size={13} weight="semibold" color={theme.muted}>
            Other supplements
          </T>
          <View style={styles.chips}>
            {app.products.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => setSelectedId(item.id)}>
                <Pill tone={item.id === product.id ? 'teal' : 'grey'}>{item.name}</Pill>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {!app.isPro ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')}>
          <Card>
            <T weight="semibold">Multi-supplement comparison is part of Pro</T>
            <T size={14} color={theme.muted}>
              Free covers one before/after at a time. Pro puts them side by side on the monthly report.
            </T>
          </Card>
        </Pressable>
      ) : null}

      <Disclaimer />
    </Screen>
  );
}

function formatHours(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function Stat({
  label,
  value,
  delta,
  deltaLabel,
  tone,
}: {
  label: string;
  value: string;
  delta: number | null;
  deltaLabel: string;
  tone: 'teal' | 'blue';
}) {
  const color = delta == null ? theme.muted : delta > 0 ? (tone === 'blue' ? theme.blue : theme.teal) : delta < 0 ? theme.muted : theme.muted;
  return (
    <View style={styles.stat}>
      <T size={12} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <T weight="bold" size={20}>
        {value}
      </T>
      <T size={12} weight="semibold" color={color}>
        {deltaLabel}
      </T>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <T size={13} color={theme.text}>
        {label}
      </T>
    </View>
  );
}

function TagButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tagButton}>
      <T size={12} weight="semibold" color={theme.teal}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    padding: 10,
    gap: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#E1E4EA', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagButton: { paddingVertical: 4 },
});
