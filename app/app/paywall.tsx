import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { BottleRow } from '@/src/components/illustrations';
import { OnboardingProgress } from '@/src/components/OnboardingProgress';
import { BackButton, Button, Card, Disclaimer, Screen, T } from '@/src/components/ui';
import { PRO_ANNUAL_CENTS, PRO_ANNUAL_SAVINGS_CENTS, PRO_MONTHLY_CENTS } from '@/src/config';
import { BROWSE_LISTED, DISCOVER_TAB_HREF } from '@/src/copy/library';
import { auditStack } from '@/src/domain/audit';
import { formatUsd } from '@/src/format';
import { EXPECTATION, goalEcho, wearableLine } from '@/src/onboarding/answers';
import { readGoals, readWearable } from '@/src/onboarding/storage';
import { purchasesAvailable } from '@/src/purchases';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

const ROWS: { label: string; free: boolean; pro: boolean }[] = [
  { label: 'Stack log + duplicates', free: true, pro: true },
  { label: 'Basic before/after', free: true, pro: true },
  { label: 'Savings score', free: false, pro: true },
  { label: 'Multi-supplement compare', free: false, pro: true },
  { label: 'Monthly impact report', free: false, pro: true },
];

export default function PaywallScreen() {
  const app = useApp();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const fromOnboarding = (Array.isArray(params.onboarding) ? params.onboarding[0] : params.onboarding) === '1';
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const price = plan === 'annual' ? `${formatUsd(PRO_ANNUAL_CENTS)}/year` : `${formatUsd(PRO_MONTHLY_CENTS)}/month`;

  async function finishFree() {
    await app.completeOnboarding();
    router.replace('/(tabs)/audit');
  }

  async function browseListed() {
    await app.completeOnboarding();
    router.replace(DISCOVER_TAB_HREF);
  }

  async function start() {
    if (app.isPro && app.previewPro && !purchasesAvailable()) {
      await app.setPreviewPro(false);
      return;
    }
    try {
      const result = await app.buy(plan);
      if (result === 'purchased') {
        if (fromOnboarding) {
          await app.completeOnboarding();
          router.replace('/(tabs)/audit');
          return;
        }
        Alert.alert('Pro is on', 'Purchases are confirmed by RevenueCat on this Apple ID.');
        return;
      }
      if (result === 'cancelled') return;
      Alert.alert(
        'Purchases need a dev build',
        'RevenueCat runs in an iOS development build with a public SDK key. You can preview Pro on this device. It is not a charge.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Preview Pro', onPress: () => void app.setPreviewPro(true) },
        ],
      );
    } catch (error) {
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Try again.');
    }
  }

  return (
    <Screen>
      {fromOnboarding ? <OnboardingProgress step="paywall" /> : null}
      <BackButton fallback={fromOnboarding ? '/onboarding/save' : '/(tabs)/more'} />
      <BottleRow />
      <T weight="bold" size={32} style={styles.title}>
        {fromOnboarding ? 'Keep this audit, and the weeks after' : 'See every dollar and every signal'}
      </T>
      {fromOnboarding ? (
        <T size={15} weight="semibold" color={theme.teal}>
          {goalEcho(readGoals())}
        </T>
      ) : null}
      <T size={16} color={theme.muted}>
        {fromOnboarding
          ? `${wearableLine(readWearable())} ${EXPECTATION}`
          : 'Free covers the basics. Pro adds multi-supplement impact, confounder notes, and a monthly report.'}
      </T>
      {fromOnboarding && audit.wastedCents > 0 ? (
        <Card style={{ backgroundColor: theme.amberBg, borderColor: theme.amberBorder }}>
          <T size={13} color={theme.amber}>
            Estimated overlap from your labels
          </T>
          <T weight="bold" size={28} color={theme.amber}>
            {`${formatUsd(audit.wastedCents)} a month`}
          </T>
        </Card>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => setPlan('annual')} style={[styles.plan, plan === 'annual' && styles.planOn]}>
        <View style={{ flex: 1 }}>
          <T weight="semibold">Annual</T>
          <T size={13} color={theme.muted}>
            Billed once a year
          </T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={styles.best}>
            <T size={11} weight="semibold" color={theme.teal}>
              Best value
            </T>
          </View>
          <T weight="bold" size={18} color={theme.amber}>
            {formatUsd(PRO_ANNUAL_CENTS)}
          </T>
          <View style={styles.save}>
            <T size={13} weight="semibold" color={theme.amber}>
              {`Save ${formatUsd(PRO_ANNUAL_SAVINGS_CENTS)}`}
            </T>
          </View>
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => setPlan('monthly')} style={[styles.plan, plan === 'monthly' && styles.planOn]}>
        <View style={{ flex: 1 }}>
          <T weight="semibold">Monthly</T>
          <T size={13} color={theme.muted}>
            Cancel any time
          </T>
        </View>
        <T weight="bold" size={18} color={theme.amber}>
          {formatUsd(PRO_MONTHLY_CENTS)}
        </T>
      </Pressable>

      <View style={styles.table}>
        <View style={styles.tableHead}>
          <View style={{ flex: 1 }} />
          <T size={12} weight="semibold" color={theme.muted} style={styles.col}>
            Free
          </T>
          <T size={12} weight="semibold" color={theme.teal} style={styles.col}>
            Pro
          </T>
        </View>
        {ROWS.map((row) => (
          <View key={row.label} style={styles.tableRow}>
            <T size={14} style={{ flex: 1 }}>
              {row.label}
            </T>
            <Mark on={row.free} />
            <Mark on={row.pro} />
          </View>
        ))}
      </View>

      <Button label={app.previewPro ? 'Turn off preview' : `Start Pro: ${price}`} onPress={() => void start()} />
      {fromOnboarding ? <Button label="Continue with Free" tone="ghost" onPress={() => void finishFree()} /> : null}
      {fromOnboarding ? (
        <Pressable accessibilityRole="link" onPress={() => void browseListed()} style={styles.link}>
          <T size={15} weight="semibold" color={theme.teal} style={{ textAlign: 'center' }}>
            {BROWSE_LISTED}
          </T>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          const restored = await app.restore();
          if (!restored) {
            Alert.alert('Nothing to restore', 'No active Pro entitlement was found. Preview Pro is local to this device.');
          }
        }}
      >
        <T size={14} weight="semibold" color={theme.teal} style={{ textAlign: 'center' }}>
          Restore purchases
        </T>
      </Pressable>
      {!purchasesAvailable() ? (
        <Pressable accessibilityRole="button" onPress={() => void app.setPreviewPro(!app.previewPro)}>
          <T size={13} color={theme.muted} style={{ textAlign: 'center' }}>
            {app.previewPro ? 'Previewing Pro on this device' : 'Preview Pro on this device'}
          </T>
        </Pressable>
      ) : null}
      <Disclaimer text="Educational only. Not medical advice. Restore purchases." />
    </Screen>
  );
}

function Mark({ on }: { on: boolean }) {
  return (
    <View style={styles.col}>
      <Ionicons name={on ? 'checkmark' : 'remove'} size={16} color={on ? theme.teal : theme.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.8 },
  plan: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planOn: { borderColor: theme.teal, backgroundColor: theme.tealSoft },
  best: { backgroundColor: theme.tealSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  save: { backgroundColor: theme.amberPill, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  table: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.line, padding: 14, gap: 10 },
  tableHead: { flexDirection: 'row', alignItems: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  col: { width: 44, textAlign: 'center', alignItems: 'center' },
  link: { minHeight: 44, justifyContent: 'center' },
});
