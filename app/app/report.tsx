import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BackButton, Button, Card, Disclaimer, Pill, Screen, T } from '@/src/components/ui';
import { ASSOCIATION } from '@/src/config';
import { MONTHLY_REPORT_LABEL } from '@/src/copy/labels';
import { localToday } from '@/src/dates';
import { REPORT_EMPTY, freshStartGaps } from '@/src/domain/emptyStates';
import { buildMonthlyReport, travelLabel } from '@/src/domain/report';
import type { Verdict } from '@/src/domain/types';
import { formatMoney, signed } from '@/src/format';
import { joinMoney } from '../../shared/money';
import { auditStack } from '@/src/domain/audit';
import { currentWearableEmptyCopy } from '@/src/health/runtime';
import { useApp } from '@/src/state';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function ReportScreen() {
  const theme = useTheme();
  const app = useApp();
  const report = useMemo(
    () => buildMonthlyReport({ today: localToday(), products: app.products, samples: app.samples, tags: app.tags }),
    [app.products, app.samples, app.tags],
  );
  const overlap =
    joinMoney(auditStack(app.products).money.map((line) => ({ currency: line.currency, cents: line.wastedCents }))) ??
    formatMoney(0, app.currency);

  if (!app.isPro) {
    return (
      <Screen>
        <BackButton label="Close" />
        <ReportTitle />
        <T size={16} color={theme.muted}>
          It lines up each supplement with a keep, drop, or unclear label, plus the overlap score and the confounders you logged.
        </T>
        <Button label="See Pro" onPress={() => router.push('/paywall')} />
        <Disclaimer />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton label="Close" />
      <ReportTitle />
      {freshStartGaps({ products: app.products.length, wearableSamples: app.samples.length }).length > 0 ? (
        <ReportEmpty products={app.products.length} />
      ) : (
        <ReportBody report={report} overlap={overlap} />
      )}
      <Disclaimer text="Wearable associations only. Not medical advice." />
    </Screen>
  );
}

function ReportEmpty({ products }: { products: number }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <>
      <T weight="semibold" size={28} style={styles.title}>
        {REPORT_EMPTY.title}
      </T>
      {products === 0 ? (
        <T size={15} color={theme.muted}>
          {REPORT_EMPTY.products}
        </T>
      ) : null}
      <T size={15} color={theme.muted}>
        {REPORT_EMPTY.wearable}
      </T>
      <T size={15} color={theme.muted}>
        {currentWearableEmptyCopy()}
      </T>
    </>
  );
}

function ReportBody({ report, overlap }: { report: ReturnType<typeof buildMonthlyReport>; overlap: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <>
      <T weight="semibold" size={18} color={theme.muted}>
        {report.month}
      </T>
      <T size={16}>{report.summary}</T>
      <Pill tone="teal">{ASSOCIATION}</Pill>

      <Card>
        <T weight="semibold" size={17}>
          Supplement comparison
        </T>
        <T size={12} color={theme.muted}>
          Deep sleep, minutes, after minus the 21 days before.
        </T>
        {report.supplements.map((item) => (
          <View key={item.productId} style={styles.line}>
            <T size={14} style={{ flex: 1 }}>
              {item.name}
            </T>
            <T weight="semibold" size={14} color={item.deepSleepDelta != null && item.deepSleepDelta > 0 ? theme.good : theme.text}>
              {item.deepSleepDelta == null ? '-' : `${signed(item.deepSleepDelta)} min`}
            </T>
          </View>
        ))}
      </Card>

      <Card>
        <T weight="semibold" size={17}>
          Keep, drop, or unclear
        </T>
        {report.supplements.map((item) => (
          <View key={item.productId} style={styles.line}>
            <T size={14} style={{ flex: 1 }}>
              {item.name}
            </T>
            <VerdictPill verdict={item.verdict} />
          </View>
        ))}
        <T size={12} color={theme.muted}>
          Drop means the overlap dollars are on this bottle and the wearable window did not move. It is not advice to stop taking it.
        </T>
      </Card>

      <View style={styles.savings}>
        <T size={13} weight="semibold" color={theme.amber}>
          Potential overlap spend
        </T>
        <T weight="semibold" size={40} color={theme.amber} style={styles.savingsValue}>
          {overlap}
        </T>
        <T size={14} color={theme.muted}>
          {`${report.dropCount} product${report.dropCount === 1 ? '' : 's'} labeled drop, ${report.nearLimitCount + report.overLimitCount} upper-limit flag${report.nearLimitCount + report.overLimitCount === 1 ? '' : 's'}`}
        </T>
        <T size={14}>
          {`Savings score ${report.savingsScore}. 100 means none of the monthly spend is tied to a duplicate ingredient.`}
        </T>
      </View>

      <Card>
        <T weight="semibold" size={17}>
          Confounders logged
        </T>
        <T size={14}>{`Hard training days: ${report.hardTrainingDays}`}</T>
        <T size={14}>{`Alcohol evenings: ${report.alcoholDays} flagged`}</T>
        <T size={14}>{`Travel: ${travelLabel(report.travelDays)}`}</T>
        <T size={12} color={theme.muted}>
          Flags are context. The basic before/after on Impact still uses every day in the window.
        </T>
      </Card>
    </>
  );
}

function ReportTitle() {
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.titleRow}>
      <T weight="semibold" size={32} style={styles.title}>
        {MONTHLY_REPORT_LABEL}
      </T>
      <Pill tone="teal">Pro</Pill>
    </View>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const tone = verdict === 'keep' ? 'teal' : verdict === 'drop' ? 'amber' : 'grey';
  const label = verdict === 'keep' ? 'Keep' : verdict === 'drop' ? 'Drop' : 'Unclear';
  return <Pill tone={tone}>{label}</Pill>;
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  title: { letterSpacing: -0.8, flex: 1 },
  savings: {
    backgroundColor: theme.amberBg,
    borderColor: theme.amberBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  savingsValue: { letterSpacing: -1.2, lineHeight: 46 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: control.compact },
});
}

