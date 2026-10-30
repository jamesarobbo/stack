import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Disclaimer, Eyebrow, Pill, Screen, T } from '@/src/components/ui';
import { ASSOCIATION } from '@/src/config';
import { localToday } from '@/src/dates';
import { buildMonthlyReport, travelLabel } from '@/src/domain/report';
import type { Verdict } from '@/src/domain/types';
import { formatUsd, signed } from '@/src/format';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function ReportScreen() {
  const app = useApp();
  const report = useMemo(
    () => buildMonthlyReport({ today: localToday(), products: app.products, samples: app.samples, tags: app.tags }),
    [app.products, app.samples, app.tags],
  );

  if (!app.isPro) {
    return (
      <Screen>
        <Eyebrow left="Pro · monthly report" right="Pro only" />
        <T weight="bold" size={32} style={styles.title}>
          The monthly report is part of Pro
        </T>
        <T size={15} color={theme.muted}>
          It lines up each supplement with a keep, drop, or unclear label, plus the overlap score and the confounders you logged.
        </T>
        <Button label="See Pro" onPress={() => router.push('/paywall')} />
        <Disclaimer />
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow left="Pro · monthly report" right="Pro" />
      <T weight="bold" size={32} style={styles.title}>
        {report.month}
      </T>
      <Card>
        <T size={13} weight="semibold" color={theme.muted}>
          Summary
        </T>
        <T size={16}>{report.summary}</T>
        <Pill tone="teal">{ASSOCIATION}</Pill>
      </Card>

      <Card>
        <T weight="semibold" size={16}>
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
            <T weight="semibold" size={14} color={item.deepSleepDelta != null && item.deepSleepDelta > 0 ? theme.teal : theme.text}>
              {item.deepSleepDelta == null ? '—' : `${signed(item.deepSleepDelta)} min`}
            </T>
          </View>
        ))}
      </Card>

      <Card>
        <T weight="semibold" size={16}>
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

      <Card>
        <T size={13} color={theme.muted}>
          Potential overlap spend
        </T>
        <T weight="bold" size={28}>
          {formatUsd(report.wastedCents)}
        </T>
        <T size={14} color={theme.muted}>
          {`${report.dropCount} product${report.dropCount === 1 ? '' : 's'} labeled drop · ${report.nearLimitCount + report.overLimitCount} upper-limit flag${report.nearLimitCount + report.overLimitCount === 1 ? '' : 's'}`}
        </T>
        <T size={14}>
          {`Savings score ${report.savingsScore}. 100 means none of the monthly spend is tied to a duplicate ingredient.`}
        </T>
      </Card>

      <Card>
        <T weight="semibold" size={16}>
          Confounders logged
        </T>
        <T size={14}>{`Hard training days · ${report.hardTrainingDays}`}</T>
        <T size={14}>{`Alcohol evenings · ${report.alcoholDays} flagged`}</T>
        <T size={14}>{`Travel · ${travelLabel(report.travelDays)}`}</T>
        <T size={12} color={theme.muted}>
          Flags are context. The basic before/after on Impact still uses every day in the window.
        </T>
      </Card>
      <Disclaimer text="Wearable associations only. Not medical advice." />
    </Screen>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const tone = verdict === 'keep' ? 'teal' : verdict === 'drop' ? 'amber' : 'grey';
  const label = verdict === 'keep' ? 'Keep' : verdict === 'drop' ? 'Drop' : 'Unclear';
  return <Pill tone={tone}>{label}</Pill>;
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});
