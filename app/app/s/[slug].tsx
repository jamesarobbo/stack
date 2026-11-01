import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Choice } from '@/src/components/OnboardingProgress';
import { ProductChips } from '@/src/components/ProductChips';
import { BrandMark, DoseMeters, FadeIn, IconAction, OutcomeHero, ResultLine, ScoreBadge, ScoreHero, Toggle } from '@/src/components/share';
import { BackButton, Button, Card, Disclaimer, Pill, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import { REPORT_REASONS, goalLabel, type ReportReasonKey } from '@/src/copy/library';
import { EngagementStats } from '@/src/components/EngagementStats';
import { COHORT_EXPLAINER, DOCTOR_LINE, creditLine, shareMessage, sharerName } from '@/src/copy/sharing';
import { spendSentence } from '../../../shared/money';
import { usernameHandle } from '../../../shared/username';
import { OFF_ATTRIBUTION } from '@/src/data/labels';
import { recordCopy, type CohortReport, type PublicShare } from '@/src/data/sharing';
import { formatUsDate, localToday } from '@/src/dates';
import { applyPlan, choicesFor, copiedProducts, planMerge, scoreAfter, shareCatalogueId, type MergeChoice, type MergeRow } from '@/src/domain/merge';
import { formatDose } from '../../../shared/doses';
import { track } from '@/src/telemetry';
import { useApp } from '@/src/state';
import { useTheme, useThemedStyles, type Theme, space } from '@/src/theme';

const CHOICE_LABEL: Record<MergeChoice, string> = { add: 'Add', skip: 'Skip', replace: 'Replace mine' };

export default function SharedStackScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const app = useApp();
  const [stack, setStack] = useState<PublicShare | null>(null);
  const [missing, setMissing] = useState(false);
  const [cohorts, setCohorts] = useState<CohortReport | null>(null);
  const [rows, setRows] = useState<MergeRow[] | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'report' | 'block'>('none');

  const [version, setVersion] = useState(0);
  const load = useCallback(async () => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!slug) return;
    let live = true;
    api<PublicShare>(`/v1/shares/${slug}`, { token: app.sessionToken })
      .then((body) => {
        if (!live) return;
        setStack(body);
        setMissing(false);
      })
      .catch((error: unknown) => {
        if (!live) return;
        if (error instanceof ApiError && error.status === 404) setMissing(true);
        else setNote(error instanceof ApiError ? error.message : 'This stack could not be loaded.');
      });
    if (app.sessionToken) {
      api<CohortReport>(`/v1/shares/${slug}/cohorts`, { token: app.sessionToken })
        .then((report) => {
          if (live) setCohorts(report);
        })
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [app.sessionToken, slug, version]);

  const local = useMemo(() => (slug ? copiedProducts(app.products, slug) : []), [app.products, slug]);
  const viewer = stack?.viewer ?? null;
  const preview = useMemo(() => (rows ? scoreAfter(app.products, rows) : null), [app.products, rows]);

  if (missing) {
    return (
      <Screen>
        <BackButton />
        <T weight="bold" size={28} style={styles.title}>
          This stack is no longer shared
        </T>
        <T color={theme.muted}>The person who shared it turned the link off, or it is hidden while reports are reviewed.</T>
      </Screen>
    );
  }

  if (!stack || !slug) {
    return (
      <Screen>
        <BackButton />
        <T color={theme.muted}>{note ?? 'Loading shared stack'}</T>
      </Screen>
    );
  }

  const who = sharerName(stack.username);
  const own = viewer?.own === true;
  const inStack = local.length > 0;
  const changedSince = viewer?.copied && !viewer.copied.current;

  function startCopy() {
    if (!stack) return;
    setNote(null);
    setRows(planMerge(app.products, stack.products));
    setConsent(viewer?.copied?.outcomeConsent ?? false);
  }

  function choose(index: number, choice: MergeChoice) {
    setRows((list) => (list ? list.map((row, at) => (at === index ? { ...row, choice } : row)) : list));
  }

  async function copyNow() {
    if (!rows || !stack || !slug) return;
    const plan = applyPlan(rows);
    if (plan.add.length === 0) {
      setNote('Nothing is selected to add.');
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const credit = creditLine(stack.username);
      await app.addMany(
        plan.add.map((product) => ({
          name: product.name,
          brand: product.brand || null,
          note: credit,
          priceCents: 0,
          servingsPerContainer: product.servingsPerContainer || 30,
          servingsPerDay: product.servingsPerDay,
          startDate: localToday(),
          catalogueId: shareCatalogueId(slug, product.source === 'off'),
          ingredients: product.ingredients.map((ingredient) => ({
            key: ingredient.key,
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            costWeight: 1,
            ...(ingredient.family ? { family: ingredient.family } : {}),
            ...(ingredient.familyLabel ? { familyLabel: ingredient.familyLabel } : {}),
          })),
        })),
        plan.replaceIds,
      );
      const counted = await recordCopy(app.sessionToken, { slug, outcomeConsent: consent });
      track('share_copy', { added: plan.add.length, replaced: plan.replaceIds.length, consent, counted });
      setRows(null);
      setNote(
        counted
          ? `Added ${plan.add.length} to your stack. Add the prices you pay to see the monthly cost.`
          : `Added ${plan.add.length} to your stack. It counts as a copy once you are signed in.`,
      );
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'The stack could not be copied. Nothing was added.');
    } finally {
      setBusy(false);
    }
  }

  async function changeConsent(next: boolean) {
    if (!app.sessionToken || !slug) return;
    try {
      await api(`/v1/shares/${slug}/outcome-consent`, { method: 'PUT', token: app.sessionToken, body: { consent: next } });
      await load();
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'That setting could not be saved.');
    }
  }

  async function toggleSave() {
    if (!app.sessionToken) {
      router.push('/sign-in');
      return;
    }
    const saved = viewer?.saved ?? false;
    try {
      await api(`/v1/shares/${slug}/save`, { method: saved ? 'DELETE' : 'POST', token: app.sessionToken });
      setStack((current) => (current && current.viewer ? { ...current, viewer: { ...current.viewer, saved: !saved } } : current));
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'That could not be saved.');
    }
  }

  async function sendReport(reason: ReportReasonKey) {
    if (!app.sessionToken) {
      router.push('/sign-in');
      return;
    }
    try {
      await api(`/v1/shares/${slug}/report`, { method: 'POST', token: app.sessionToken, body: { reason } });
      setPanel('none');
      setNote('Report sent. A person reviews every report, and a stack reported by 3 people is hidden until then.');
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'The report could not be sent. Try again.');
    }
  }

  async function setBlocked(next: boolean) {
    if (!app.sessionToken) {
      router.push('/sign-in');
      return;
    }
    try {
      await api(`/v1/shares/${slug}/block`, { method: next ? 'POST' : 'DELETE', token: app.sessionToken });
      setPanel('none');
      setNote(next ? `${who} is blocked. Their stacks no longer appear in Discover for you.` : `${who} is unblocked.`);
      await load();
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'That did not work. Try again.');
    }
  }

  async function sendLink() {
    if (!stack) return;
    try {
      await Share.share({ message: shareMessage({ stackName: stack.stackName, score: stack.auditScore, url: stack.url }) });
    } catch {
      setNote(stack.url);
    }
  }

  const footer = own ? (
    <Button label="Edit what you share" kind="secondary" onPress={() => router.push('/share')} />
  ) : rows ? (
    <View style={{ gap: 8 }}>
      <Button label={busy ? 'Adding' : `Add ${applyPlan(rows).add.length} to my stack`} disabled={busy} onPress={() => void copyNow()} />
      <Button label="Cancel" kind="secondary" onPress={() => setRows(null)} />
    </View>
  ) : inStack && !changedSince ? (
    <Button label="In your stack" kind="secondary" onPress={() => router.push('/(tabs)/stack')} />
  ) : (
    <Button label={changedSince && inStack ? 'Copy the update' : 'Copy to my stack'} onPress={startCopy} />
  );

  return (
    <Screen footer={footer}>
      <BackButton />
      <FadeIn>
        <View style={{ gap: 8 }}>
          <BrandMark />
          <T weight="bold" size={32} style={styles.title}>
            {stack.stackName}
          </T>
          <T size={15} color={theme.muted}>
            {`${who}, ${stack.products.length} ${stack.products.length === 1 ? 'product' : 'products'}`}
          </T>
          {spendSentence(stack.spend ?? []) ? (
            <T size={17} weight="bold" color={theme.amber}>
              {spendSentence(stack.spend ?? [])}
            </T>
          ) : null}
          <ProductChips names={stack.products.map((product) => product.name)} />
          {stack.goals.length > 0 ? (
            <View style={styles.pills}>
              {stack.goals.map((goal) => (
                <Pill key={goal} tone="teal">
                  {goalLabel(goal)}
                </Pill>
              ))}
            </View>
          ) : null}
          <EngagementStats copies={stack.copyCount} views={stack.viewCount} />
        </View>
      </FadeIn>

      <FadeIn delay={60}>
        <ScoreHero score={stack.score.score} summary={stack.score.summary} reasons={stack.score.reasons} />
      </FadeIn>

      {stack.result ? (
        <FadeIn delay={100}>
          <OutcomeHero result={stack.result} who={usernameHandle(stack.username)} />
        </FadeIn>
      ) : null}

      {rows && preview ? (
        <FadeIn>
          <Card style={styles.merge}>
            <T weight="bold" size={20} style={styles.title}>
              Before you copy
            </T>
            <View style={styles.scoreChange}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ScoreBadge score={preview.before} size={72} />
                <T size={13} color={theme.muted}>
                  Your score now
                </T>
              </View>
              <T size={16} weight="semibold" color={theme.muted}>
                to
              </T>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ScoreBadge score={preview.after} size={72} />
                <T size={13} color={theme.muted}>
                  After copying
                </T>
              </View>
            </View>
            <T size={13} color={theme.muted} style={{ textAlign: 'center' }}>
              {preview.summary}
            </T>
            {rows.map((row, index) => (
              <View key={`${row.product.id}-${index}`} style={styles.mergeRow}>
                <View style={styles.rowBetween}>
                  <T weight="semibold" style={{ flex: 1 }}>
                    {row.product.name}
                  </T>
                  <Pill tone={row.status === 'new' ? 'teal' : row.status === 'same' ? 'grey' : 'amber'}>
                    {row.status === 'new' ? 'New to you' : row.status === 'same' ? 'You take this' : 'Overlaps'}
                  </Pill>
                </View>
                {row.status !== 'new' ? (
                  <T size={13} color={theme.muted}>
                    {row.status === 'same'
                      ? `Already in your stack as ${row.mine.map((item) => item.name).join(', ')}`
                      : `${row.overlapping.join(', ')} is also in ${row.mine.map((item) => item.name).join(', ')}`}
                  </T>
                ) : null}
                <View style={styles.choiceRow}>
                  {choicesFor(row.status).map((choice) => (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityState={{ selected: row.choice === choice }}
                      onPress={() => choose(index, choice)}
                      style={[styles.choice, row.choice === choice ? styles.choiceOn : null]}
                    >
                      <T size={13} weight="semibold" color={row.choice === choice ? '#FFFFFF' : theme.text}>
                        {CHOICE_LABEL[choice]}
                      </T>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Toggle
              label="Add my result to this stack's group"
              detail="After 14 weeks, the app works out how your resting heart rate, heart rate variability, and deep sleep changed, on this phone. Only those changes are sent, grouped with at least 10 people. You can turn this off at any time."
              value={consent}
              onChange={setConsent}
            />
            <T size={13} color={theme.muted}>
              Copies start today with no price. Nothing is added until you confirm below.
            </T>
          </Card>
        </FadeIn>
      ) : null}

      {viewer?.copied && !own ? (
        <Card>
          <T weight="semibold">{inStack ? `You copied this on ${formatUsDate(viewer.copied.copiedOn)}` : 'You copied this before'}</T>
          {changedSince ? (
            <T size={14} color={theme.muted}>
              It changed since you copied it. Copy the update to follow the new version.
            </T>
          ) : null}
          {!inStack ? (
            <T size={14} color={theme.muted}>
              The copied products are no longer in your stack. You can copy it again.
            </T>
          ) : null}
          <Toggle
            label="Add my result to this stack's group"
            detail="Worked out on this phone after 14 weeks. Only the change is sent."
            value={viewer.copied.outcomeConsent}
            onChange={(next) => void changeConsent(next)}
          />
        </Card>
      ) : null}

      <FadeIn delay={160}>
        <Card>
          <T weight="semibold" size={17}>
            Daily doses
          </T>
          <DoseMeters totals={stack.score.totals} />
        </Card>
      </FadeIn>

      <Card>
        <T weight="semibold" size={17}>
          Products
        </T>
        {stack.products.map((product, index) => (
          <View key={`${product.id}-${index}`} style={[styles.product, index === 0 ? { borderTopWidth: 0, paddingTop: 0 } : null]}>
            <T weight="semibold">{product.name}</T>
            {product.brand ? (
              <T size={13} color={theme.muted}>
                {product.brand}
              </T>
            ) : null}
            <T size={14} color={theme.muted}>
              {`${formatDose(product.servingsPerDay)} a day. Per day: ${product.ingredients
                .map((ingredient) => `${ingredient.name} ${formatDose(ingredient.amount * product.servingsPerDay)} ${ingredient.unit}`)
                .join(', ')}`}
            </T>
          </View>
        ))}
        {stack.updatedOn && stack.changes.length > 0 ? (
          <View style={styles.changes}>
            <T size={13} weight="semibold">{`Updated on ${formatUsDate(stack.updatedOn)}`}</T>
            {stack.changes.map((change) => (
              <T key={change} size={13} color={theme.muted}>
                {change}
              </T>
            ))}
          </View>
        ) : null}
      </Card>

      {app.sessionToken && cohorts && cohorts.metrics.some((metric) => metric.slices.length > 0) ? (
        <Card>
          <T weight="semibold" size={17}>
            People who copied this
          </T>
          <T size={13} color={theme.muted}>
            {COHORT_EXPLAINER}
          </T>
          {cohorts.metrics
            .filter((metric) => metric.slices.length > 0)
            .map((metric) => (
              <View key={metric.metric} style={styles.metric}>
                <T weight="semibold" size={15}>
                  {metric.label}
                </T>
                {metric.slices.map((slice) => (
                  <View key={slice.key} style={[styles.slice, slice.key === cohorts.viewerCohort ? styles.sliceYou : null]}>
                    <View style={{ flex: 1 }}>
                      <T size={14}>{slice.key === cohorts.viewerCohort ? `${slice.label}, like you` : slice.label}</T>
                      <T size={12} color={theme.muted}>
                        {slice.people}
                      </T>
                    </View>
                    <View style={{ maxWidth: '50%' }}>
                      <ResultLine line={sentence(slice.band)} note={cohorts.disclaimer} size={14} weight="semibold" align="right" />
                    </View>
                  </View>
                ))}
              </View>
            ))}
        </Card>
      ) : null}

      {note ? (
        <Card style={{ backgroundColor: theme.tealSoft, borderColor: theme.tealSoft }}>
          <T size={14}>{note}</T>
        </Card>
      ) : null}

      {!own ? (
        <View style={styles.actions}>
          <IconAction icon={viewer?.saved ? 'bookmark' : 'bookmark-outline'} label={viewer?.saved ? 'Saved' : 'Save'} active={viewer?.saved} onPress={() => void toggleSave()} />
          <IconAction icon="share-outline" label="Send" onPress={() => void sendLink()} />
          <IconAction icon="flag-outline" label="Report" onPress={() => setPanel(panel === 'report' ? 'none' : 'report')} />
          <IconAction
            icon="hand-left-outline"
            label={viewer?.blocked ? 'Unblock' : 'Block'}
            onPress={() => (viewer?.blocked ? void setBlocked(false) : setPanel(panel === 'block' ? 'none' : 'block'))}
          />
        </View>
      ) : null}

      {panel === 'report' ? (
        <Card>
          <T weight="semibold">What is wrong with this stack?</T>
          {REPORT_REASONS.map((reason) => (
            <Choice key={reason.key} label={reason.label} selected={false} onPress={() => void sendReport(reason.key)} />
          ))}
        </Card>
      ) : null}
      {panel === 'block' ? (
        <Card>
          <T weight="semibold">{`Block ${who}?`}</T>
          <T size={14} color={theme.muted}>
            Their stacks leave Discover for you. They are not told. You can clear blocks in Settings.
          </T>
          <Button label="Block" kind="destructive" onPress={() => void setBlocked(true)} />
        </Card>
      ) : null}

      {stack.openFoodFacts ? (
        <T size={12} color={theme.muted}>
          {`${OFF_ATTRIBUTION}.`}
        </T>
      ) : null}
      <T>{DOCTOR_LINE}</T>
      <Disclaimer />
    </Screen>
  );
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  merge: { borderColor: theme.teal, borderWidth: 2, gap: 12 },
  scoreChange: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 4 },
  mergeRow: { borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 12, gap: 6 },
  choiceRow: { flexDirection: 'row', gap: 6 },
  choice: { borderRadius: 999, paddingHorizontal: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  choiceOn: { backgroundColor: theme.teal },
  product: { borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 12, gap: space.xxs },
  changes: { backgroundColor: theme.bg, borderRadius: 12, padding: 12, gap: 4, marginTop: 4 },
  metric: { gap: space.xxs, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 10 },
  slice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: space.sm, paddingHorizontal: 8, borderRadius: 10 },
  sliceYou: { backgroundColor: theme.tealSoft },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
}

