import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DoseMeters, FadeIn, ScoreHero } from '@/src/components/share';
import { Card, Disclaimer, EmptyLead, Pill, Screen, T } from '@/src/components/ui';
import { GO_TO_STACK_LABEL, STACK_TAB_HREF } from '@/src/copy/labels';
import { BROWSE_LISTED, DISCOVER_TAB_HREF } from '@/src/copy/library';
import { auditStack, formatWasted } from '@/src/domain/audit';
import { scoreProducts } from '@/src/domain/auditScore';
import { AUDIT_EMPTY } from '@/src/domain/emptyStates';
import { formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function AuditScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const scored = useMemo(() => scoreProducts(app.products), [app.products]);
  const flagCount = audit.limits.length;
  const hasGaps = audit.duplicates.length > 0 || audit.limits.length > 0 || scored.score < 80;

  if (app.products.length === 0) {
    return (
      <Screen>
        <EmptyLead title={AUDIT_EMPTY.title} body={AUDIT_EMPTY.body} />
        <Pressable accessibilityRole="link" onPress={() => router.navigate(STACK_TAB_HREF)} style={styles.link}>
          <T weight="semibold" color={theme.teal}>
            {GO_TO_STACK_LABEL}
          </T>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      {app.usingSampleData ? <Pill>Example data</Pill> : null}
      <FadeIn>
        <ScoreHero score={scored.score} summary={scored.summary} reasons={scored.reasons} />
      </FadeIn>
      {hasGaps ? (
        <Pressable accessibilityRole="link" onPress={() => router.navigate(DISCOVER_TAB_HREF)} style={styles.link}>
          <T weight="semibold" color={theme.teal}>
            {BROWSE_LISTED}
          </T>
        </Pressable>
      ) : null}
      <View style={styles.savings}>
        <Pill tone="amber">Possible savings</Pill>
        <T weight="bold" size={32} color={theme.amber} style={styles.savingsTitle}>
          {audit.wastedCents > 0 ? `You could save ${formatUsd(audit.wastedCents)} a month` : 'No duplicate spend found'}
        </T>
        <T size={14} color={theme.muted}>
          {audit.subtitle}
        </T>
      </View>

      {scored.totals.length > 0 ? (
        <Card>
          <T weight="semibold" size={17}>
            Daily totals
          </T>
          <DoseMeters totals={scored.totals} />
        </Card>
      ) : null}

      <Card>
        <T weight="semibold" size={17}>
          Duplicate ingredients
        </T>
        {audit.duplicates.length > 0 ? (
          <T size={14} weight="semibold" color={theme.muted}>
            The same ingredient is in more than one product.
          </T>
        ) : null}
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
          <T weight="semibold" size={17}>
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
              <T size={13} color={theme.muted}>
                {finding.citation}
              </T>
            </View>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.lineHeader}>
          <T weight="semibold" size={17}>
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

function localStyles(theme: Theme) {
  return StyleSheet.create({
  link: { minHeight: 44, justifyContent: 'center' },
  savings: {
    backgroundColor: theme.amberBg,
    borderColor: theme.amberBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  savingsTitle: { letterSpacing: -0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  moneyPill: { backgroundColor: theme.amberPill, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
}

