import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { suggestGoals } from '../../shared/goalSuggestions';
import { Platform, Share, StyleSheet, TextInput, View } from 'react-native';
import { Choice } from '@/src/components/OnboardingProgress';
import { Chip, FadeIn, OutcomeHero, ScoreHero, ShareCardPreview, StoryCardPreview, Toggle, type CardResult } from '@/src/components/share';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import { LIBRARY_GOALS, goalLabel, type LibraryGoalKey } from '@/src/copy/library';
import {
  EXAMPLE_CANNOT_SHARE,
  NOT_ENOUGH_OUTCOME,
  SHARE_STACK_LABEL,
  copyCountLabel,
  shareMessage,
} from '@/src/copy/sharing';
import { creatorResults, sharePayloadProducts, type OwnShare, type ShareView } from '@/src/data/sharing';
import { scoreStack } from '@/src/domain/auditScore';
import { earliestReady, heroParts, submittedFields, type OutcomeMetric, type OutcomeResult } from '@/src/domain/outcome';
import { formatUsDate } from '@/src/dates';
import { track } from '@/src/telemetry';
import { useApp } from '@/src/state';
import { font, useTheme, useThemedStyles, type Theme } from '@/src/theme';

type ResultChoice = 'none' | 'keep' | OutcomeMetric;

export default function ShareScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const scored = useMemo(() => scoreStack(app.products), [app.products]);
  const realHealth = app.healthSource === 'healthkit' && !app.usingSampleData && app.samples.length > 0;
  const results = useMemo(() => (realHealth ? creatorResults(app.products, app.samples) : []), [app.products, app.samples, realHealth]);
  const eligible = results.filter((item): item is OutcomeResult => item.eligible);
  const readyOn = earliestReady(results);

  const [current, setCurrent] = useState<OwnShare | null>(null);
  const [fetched, setFetched] = useState(false);
  const [selected, setSelected] = useState<ResultChoice>('none');
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState(app.displayName);
  const [listed, setListed] = useState(false);
  const [stackName, setStackName] = useState('');
  const [goals, setGoals] = useState<LibraryGoalKey[] | null>(null);
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [confirmUnshare, setConfirmUnshare] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!app.sessionToken) return;
    void api<{ share: OwnShare | null }>('/v1/shares/current', { token: app.sessionToken })
      .then((body) => {
        const share = body.share;
        setCurrent(share);
        if (!share) return;
        setSelected(share.result ? 'keep' : 'none');
        setShowName(share.displayName != null);
        if (share.displayName) setName(share.displayName);
        setListed(share.listed);
        setStackName(share.stackName);
        setGoals(share.goals.filter((goal): goal is LibraryGoalKey => LIBRARY_GOALS.some((item) => item.key === goal)));
      })
      .catch(() => undefined)
      .finally(() => setFetched(true));
  }, [app.sessionToken]);

  const suggestions = useMemo(
    () =>
      suggestGoals(
        app.products.map((product) => ({
          name: product.name,
          ingredients: product.ingredients.map((ingredient) => ({ key: ingredient.key, name: ingredient.name })),
        })),
      ),
    [app.products],
  );
  const waitingForShare = !!app.sessionToken && !fetched;
  const chosenGoals = goals ?? (waitingForShare || current ? [] : suggestions);
  const showingSuggestions = !waitingForShare && goals == null && !current && suggestions.length > 0;

  const shownName = showName ? name.trim() : '';
  const previewName = stackName.trim() || (shownName ? `${shownName}'s stack` : (app.products[0]?.name ?? 'Shared stack'));
  const chosen: OutcomeResult | null = selected !== 'none' && selected !== 'keep' ? (eligible.find((item) => item.metric === selected) ?? null) : null;
  const resultToShow = selected === 'keep' ? current?.result : chosen;
  const previewResult: CardResult | null = resultToShow
    ? {
        ...heroParts(resultToShow),
        label: resultToShow.label,
        device: resultToShow.device,
        disclaimer: resultToShow.disclaimer ?? '1 person, not a trial',
        kicker: shownName ? `What changed for ${shownName}` : (resultToShow.framing ?? 'What changed for me'),
      }
    : null;
  const blocked = app.usingSampleData;
  const loaded = !app.sessionToken || fetched;

  async function publish() {
    if (!app.sessionToken) return;
    setBusy(true);
    setNotice(null);
    try {
      if (showName && name.trim() !== app.displayName) await app.setName(name.trim());
      const saved = await api<ShareView>('/v1/shares', {
        method: 'POST',
        token: app.sessionToken,
        body: {
          displayName: shownName || null,
          stackName: stackName.trim() || null,
          goals: chosenGoals,
          listed,
          products: sharePayloadProducts(app.products),
          result: selected === 'keep' ? 'keep' : chosen ? submittedFields(chosen) : null,
        },
      });
      setCurrent({ ...saved, hidden: false });
      setStep('edit');
      setSelected(saved.result ? 'keep' : 'none');
      track('share_publish', { listed, result: saved.result != null, first: current == null });
      await openShareSheet(saved);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'The link could not be created.');
      setStep('edit');
    } finally {
      setBusy(false);
    }
  }

  async function openShareSheet(share: ShareView) {
    const message = shareMessage({ stackName: share.stackName, score: share.auditScore, url: share.url });
    try {
      await Share.share(Platform.OS === 'ios' ? { message, url: share.url } : { message });
    } catch {
      setNotice('The share sheet could not open. The link is below.');
    }
  }

  async function unshare() {
    if (!app.sessionToken) return;
    setBusy(true);
    try {
      await api('/v1/shares/current', { method: 'DELETE', token: app.sessionToken });
      setCurrent(null);
      setConfirmUnshare(false);
      setSelected('none');
      setNotice('The link is off. Anyone who opens it now sees that it is no longer shared.');
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'The link could not be turned off. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const canPublish = !!app.sessionToken && app.products.length > 0 && !blocked && loaded;

  if (step === 'review') {
    return (
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button label={busy ? 'Publishing' : current ? 'Publish update and share' : 'Publish and share'} disabled={busy} onPress={() => void publish()} />
            <Button label="Go back and edit" tone="ghost" onPress={() => setStep('edit')} />
          </View>
        }
      >
        <T weight="bold" size={30} style={styles.title}>
          This will be public
        </T>
        <T size={15} color={theme.muted}>
          Anyone with the link can see this page, even without the app.
        </T>
        <Card>
          <ReviewRow label="Stack name" value={previewName} />
          <ReviewRow label="Your name" value={shownName ? `${shownName}, shown on the page` : 'Hidden. The page says A Stack user.'} />
          <ReviewRow label="Products" value={`${app.products.length}, with their doses and brands. Prices, notes, and start dates stay on your phone.`} />
          <ReviewRow label="Audit score" value={`${scored.score} out of 100, with the reasons`} />
          <ReviewRow
            label="Personal result"
            value={resultToShow ? `${resultToShow.line}. The page says you tracked a result and the app shows it.` : 'None'}
          />
          <ReviewRow label="Goals" value={chosenGoals.length > 0 ? chosenGoals.map(goalLabel).join(', ') : 'None'} />
          <ReviewRow
            label="Who can find it"
            value={listed ? 'Listed in Discover and searchable by stack name, ingredient, and your name if shown' : 'Only people you send the link to'}
          />
        </Card>
        <T size={13} color={theme.muted}>
          No wearable samples are sent. A personal result is worked out on this phone and only its headline is published. You can unshare at any time.
        </T>
        {notice ? (
          <T size={14} color={theme.flagText}>
            {notice}
          </T>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        canPublish ? (
          <Button label={current ? 'Review update' : 'Review and publish'} disabled={busy} onPress={() => setStep('review')} />
        ) : null
      }
    >
      <BackButton />
      <T weight="bold" size={32} style={styles.title}>
        {SHARE_STACK_LABEL}
      </T>
      <T size={15} color={theme.muted}>
        The tall card is for a story. The wide card is the link preview. Anyone with the link can open the page, and people with the app can copy it.
      </T>

      {app.products.length === 0 ? (
        <Card>
          <T>Add a supplement before sharing.</T>
        </Card>
      ) : null}
      {blocked && app.products.length > 0 ? (
        <Card>
          <T>{EXAMPLE_CANNOT_SHARE}</T>
        </Card>
      ) : null}
      {!app.sessionToken ? (
        <Card>
          <T>Sign in to share your stack. Your link stays tied to your account so you can update or turn it off.</T>
          <Button label="Sign in" onPress={() => router.push('/sign-in')} />
        </Card>
      ) : null}

      {current ? (
        <FadeIn>
          <Card style={styles.linkCard}>
            <View style={styles.rowBetween}>
              <T weight="semibold">Your link is live</T>
              {current.hidden ? (
                <T size={13} weight="semibold" color={theme.flagText}>
                  Hidden for review
                </T>
              ) : null}
            </View>
            <T size={14} color={theme.teal} style={{ fontWeight: font.medium }}>
              {shortLink(current.url)}
            </T>
            <T size={13} color={theme.muted}>
              {[
                current.listed ? 'Listed in Discover' : 'Link only',
                copyCountLabel(current.copyCount),
                current.updatedOn ? `Updated on ${formatUsDate(current.updatedOn)}` : `Shared on ${formatUsDate(current.createdOn)}`,
              ]
                .filter(Boolean)
                .join('. ')}
            </T>
            {current.hidden ? (
              <T size={13} color={theme.muted}>
                Several people reported this stack, so it is off the page and Discover until it is reviewed.
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button label="Send link" onPress={() => void openShareSheet(current)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Unshare" tone="ghost" onPress={() => setConfirmUnshare(true)} />
              </View>
            </View>
            {confirmUnshare ? (
              <View style={styles.confirm}>
                <T size={14}>Turn the link off? It stops working for everyone, leaves Discover, and the copy count starts again if you share later.</T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button label="Keep sharing" tone="ghost" onPress={() => setConfirmUnshare(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Turn off" disabled={busy} onPress={() => void unshare()} />
                  </View>
                </View>
              </View>
            ) : null}
          </Card>
        </FadeIn>
      ) : null}

      {app.products.length > 0 && !blocked ? (
        <>
          <FadeIn delay={40}>
            <StoryCardPreview
              stackName={previewName}
              creator={shownName || 'A Stack user'}
              productCount={app.products.length}
              score={scored.score}
              summary={scored.summary}
              composition={scored.totals.map((total) => ({ name: total.name, ofLimit: total.ofLimit }))}
              result={previewResult}
            />
          </FadeIn>
          <FadeIn delay={60}>
            <ShareCardPreview
              stackName={previewName}
              creator={shownName || 'A Stack user'}
              productCount={app.products.length}
              score={scored.score}
              summary={scored.summary}
              composition={scored.totals.map((total) => ({ name: total.name, ofLimit: total.ofLimit }))}
              result={previewResult}
            />
          </FadeIn>
          <FadeIn delay={80}>
            <ScoreHero score={scored.score} summary={scored.summary} reasons={scored.reasons} />
          </FadeIn>
        </>
      ) : null}

      {app.sessionToken && app.products.length > 0 && !blocked ? (
        <>
          <Card>
            <T weight="semibold">Personal result</T>
            <T size={13} color={theme.muted}>
              Optional. Worked out on this phone from Apple Health. Only the headline is published, never your samples.
            </T>
            {!realHealth ? (
              <T size={14} color={theme.muted}>
                Connect Apple Health to add a before and after result.
              </T>
            ) : eligible.length === 0 ? (
              <T size={14} color={theme.muted}>
                {readyOn ? `${NOT_ENOUGH_OUTCOME} The first one is ready on ${formatUsDate(readyOn)}.` : NOT_ENOUGH_OUTCOME}
              </T>
            ) : null}
            <Choice label="No personal result" selected={selected === 'none'} onPress={() => setSelected('none')} />
            {current?.result ? (
              <Choice label={`Keep the published one: ${current.result.line}`} selected={selected === 'keep'} onPress={() => setSelected('keep')} />
            ) : null}
            {eligible.map((item) => (
              <Choice key={item.metric} label={item.line} selected={selected === item.metric} onPress={() => setSelected(item.metric)} />
            ))}
            {resultToShow ? <OutcomeHero result={resultToShow} /> : null}
          </Card>

          <Card>
            <T weight="semibold">Name</T>
            <Toggle
              label="Show my name on the page"
              detail="Off by default. When listed, people can find the stack by this name."
              value={showName}
              onChange={setShowName}
            />
            {showName ? (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                placeholderTextColor={theme.faint}
                accessibilityLabel="Name to show"
                style={styles.input}
              />
            ) : null}
            <T weight="semibold">Stack name</T>
            <TextInput
              value={stackName}
              onChangeText={setStackName}
              placeholder={shownName ? `${shownName}'s stack` : 'Evening magnesium'}
              placeholderTextColor={theme.faint}
              accessibilityLabel="Stack name"
              style={styles.input}
            />
            <T size={13} color={theme.muted}>
              Names with links, contact details, or words like cure or treat are not accepted.
            </T>
          </Card>

          <Card>
            <T weight="semibold">Goals</T>
            <T size={13} color={theme.muted}>
              Up to 3. People can filter Discover by these.
            </T>
            {showingSuggestions ? (
              <T size={13} color={theme.muted}>
                Suggested from your products
              </T>
            ) : null}
            <View style={styles.chips}>
              {LIBRARY_GOALS.map((goal) => (
                <Chip
                  key={goal.key}
                  label={goal.label}
                  selected={chosenGoals.includes(goal.key)}
                  onPress={() => {
                    setGoals((list) => {
                      const base = list ?? chosenGoals;
                      if (base.includes(goal.key)) return base.filter((item) => item !== goal.key);
                      if (base.length >= 3) return base;
                      return [...base, goal.key];
                    });
                  }}
                />
              ))}
            </View>
          </Card>

          <Card>
            <T weight="semibold">Who can find this</T>
            <Choice label="Link only" selected={!listed} onPress={() => setListed(false)} />
            <T size={13} color={theme.muted}>
              Only people with the link. The page stays out of search engines.
            </T>
            <Choice label="List in Discover" selected={listed} onPress={() => setListed(true)} />
            <T size={13} color={theme.muted}>
              People in the app can find and copy it. The page can be indexed. Stacks with a dose above twice the upper limit are not listed.
            </T>
          </Card>
        </>
      ) : null}

      {notice ? (
        <T size={14} color={theme.muted}>
          {notice}
        </T>
      ) : null}
    </Screen>
  );
}

/** The full link goes in the share sheet. On screen, host and the start of the slug are enough to recognise it. */
function shortLink(url: string): string {
  const match = /^https?:\/\/([^/]+)\/s\/([a-f0-9]+)/.exec(url);
  return match ? `${match[1]}/s/${match[2]?.slice(0, 10)}\u2026` : url;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2, paddingVertical: 4 }}>
      <T size={13} weight="semibold" color={theme.muted}>
        {label}
      </T>
      <T size={15}>{value}</T>
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkCard: { borderColor: theme.tealSoft, borderWidth: 2 },
  confirm: { backgroundColor: theme.bg, borderRadius: 12, padding: 12, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: font.regular,
    color: theme.text,
  },
});
}

