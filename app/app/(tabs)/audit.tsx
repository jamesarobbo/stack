import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Disclaimer, Eyebrow, Pill, Screen, T } from '@/src/components/ui';
import { auditStack, formatWasted } from '@/src/domain/audit';
import { formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function AuditScreen() {
  const app = useApp();
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const flagCount = audit.limits.length;

  return (
    <Screen>
      <Eyebrow left="Audit results" right={app.usingSampleData ? 'Fictional example' : undefined} />
      <T weight="bold" size={32} style={styles.title}>
        Where spend and doses overlap
      </T>
      <View style={styles.savings}>
        <Pill tone="amber">Possible savings</Pill>
        <T weight="bold" size={28} style={styles.savingsTitle}>
          {audit.wastedCents > 0 ? `You could save ${formatUsd(audit.wastedCents)}/month` : 'No duplicate spend found'}
        </T>
        <T size={14} color={theme.muted}>
          {audit.subtitle}
        </T>
      </View>

      <Card>
        <T weight="semibold" size={16}>
          Duplicate ingredients
        </T>
        {audit.duplicates.length === 0 ? (
          <T size={14} color={theme.muted}>
            Each ingredient shows up in one product.
          </T>
        ) : (
          audit.duplicates.map((finding) => (
            <View key={finding.family} style={styles.line}>
              <View style={{ flex: 1 }}>
                <T weight="semibold">{finding.label}</T>
                <T size={13} color={theme.muted}>
                  {finding.detail}
                </T>
              </View>
              <View style={styles.moneyPill}>
                <T size={13} weight="semibold" color={theme.amber}>
                  {formatWasted(finding.wastedCents)}
                </T>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.lineHeader}>
          <T weight="semibold" size={16}>
            Near published upper limit
          </T>
          {flagCount > 0 ? <Pill tone="flag">{`${flagCount} flag${flagCount === 1 ? '' : 's'}`}</Pill> : null}
        </View>
        {audit.limits.length === 0 ? (
          <T size={14} color={theme.muted}>
            No logged vitamin or mineral total is near an NIH ODS upper limit.
          </T>
        ) : (
          audit.limits.map((finding) => (
            <View key={finding.key} style={{ gap: 4 }}>
              <T size={14}>{finding.message}</T>
              <T size={12} color={theme.faint}>
                {finding.citation}
              </T>
            </View>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.lineHeader}>
          <T weight="semibold" size={16}>
            Interaction notes
          </T>
          <Pill>Educational</Pill>
        </View>
        {audit.interactions.length === 0 ? (
          <T size={14} color={theme.muted}>
            No notes from the small rules file for this stack.
          </T>
        ) : (
          audit.interactions.map((note) => (
            <T key={note.id} size={14}>
              {note.message}
            </T>
          ))
        )}
      </Card>

      {!app.isPro ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')}>
          <Card>
            <T weight="semibold">Savings score is part of Pro</T>
            <T size={14} color={theme.muted}>
              The dollar overlap above is included. Pro adds a 0 to 100 savings score on the monthly report.
            </T>
          </Card>
        </Pressable>
      ) : null}

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6, marginTop: 4 },
  savings: {
    backgroundColor: theme.amberBg,
    borderColor: theme.amberBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  savingsTitle: { letterSpacing: -0.4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  moneyPill: { backgroundColor: theme.amberPill, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
