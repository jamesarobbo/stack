import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, TextInput, View } from 'react-native';
import { Choice } from '@/src/components/OnboardingProgress';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import { API_URL } from '@/src/config';
import { LIBRARY_GOALS, type LibraryGoalKey } from '@/src/copy/library';
import {
  EXAMPLE_NOT_PERSONAL,
  NOT_ENOUGH_OUTCOME,
  OUTCOME_METRICS,
  SHARE_STACK_LABEL,
  copyCountLabel,
  type OutcomeMetricKey,
} from '@/src/copy/sharing';
import { auditScore } from '@/src/domain/auditScore';
import { formatNumber } from '@/src/format';
import { localToday } from '@/src/dates';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

type Preview = { metric: OutcomeMetricKey; line: string };

type CurrentShare = { slug: string; copyCount: number; publicIndex: boolean; stackName: string | null; goals: string[] };

export default function ShareScreen() {
  const app = useApp();
  const score = useMemo(() => auditScore(app.products), [app.products]);
  const stackStart = useMemo(() => {
    const dates = app.products.map((product) => product.startDate).sort();
    return dates[0] ?? localToday();
  }, [app.products]);
  const [selected, setSelected] = useState<'none' | OutcomeMetricKey>('none');
  const [publicIndex, setPublicIndex] = useState(false);
  const [stackName, setStackName] = useState('');
  const [goals, setGoals] = useState<LibraryGoalKey[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copyCount, setCopyCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const realWearable = app.healthSource === 'healthkit' && !app.usingSampleData && app.samples.length > 0;

  useEffect(() => {
    if (!app.sessionToken) return;
    void api<{ share: CurrentShare | null }>('/v1/shares/current', { token: app.sessionToken })
      .then((body) => {
        if (!body.share) return;
        setLink(`${API_URL}/s/${body.share.slug}`);
        setCopyCount(body.share.copyCount);
        setPublicIndex(body.share.publicIndex);
        setStackName(body.share.stackName ?? '');
        setGoals(body.share.goals.filter((goal): goal is LibraryGoalKey => LIBRARY_GOALS.some((item) => item.key === goal)));
      })
      .catch(() => undefined);
  }, [app.sessionToken]);

  useEffect(() => {
    if (!app.sessionToken || !realWearable) return;
    let live = true;
    void (async () => {
      const found: Preview[] = [];
      for (const metric of OUTCOME_METRICS) {
        const samples = app.samples.filter((sample) => sample.metric === metric.key).map((sample) => ({ date: sample.date, value: sample.value }));
        if (samples.length === 0) continue;
        try {
          const result = await api<{ eligible: boolean; line?: string; reason?: string }>('/v1/outcomes/preview', {
            method: 'POST',
            token: app.sessionToken,
            body: { metric: metric.key, samples, stackStart, device: 'Apple Health', asOf: localToday() },
          });
          if (result.eligible && result.line) found.push({ metric: metric.key, line: result.line });
        } catch {
          // A failed preview leaves that metric off the list. The screen still offers none.
        }
      }
      if (live) {
        setPreviews(found);
        if (found.length === 0) setNotice(NOT_ENOUGH_OUTCOME);
      }
    })();
    return () => {
      live = false;
    };
  }, [app.samples, app.sessionToken, realWearable, stackStart]);

  async function publish() {
    if (!app.sessionToken) return;
    setBusy(true);
    setNotice(null);
    const chosen = previews.find((item) => item.metric === selected);
    try {
      const saved = await api<{ slug: string; copyCount: number }>('/v1/shares', {
        method: 'POST',
        token: app.sessionToken,
        body: {
          displayName: app.displayName || null,
          stackName: stackName.trim() || null,
          goals,
          publicIndex,
          products: app.products.map((product) => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            servingsPerContainer: product.servingsPerContainer,
            servingsPerDay: product.servingsPerDay,
            ingredients: product.ingredients.map((ingredient) => ({
              key: ingredient.key,
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
            })),
          })),
          result:
            chosen == null
              ? null
              : {
                  metric: chosen.metric,
                  stackStart,
                  device: 'Apple Health',
                  asOf: localToday(),
                  samples: app.samples
                    .filter((sample) => sample.metric === chosen.metric)
                    .map((sample) => ({ date: sample.date, value: sample.value })),
                },
        },
      });
      const url = `${API_URL}/s/${saved.slug}`;
      setLink(url);
      setCopyCount(saved.copyCount);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'The link could not be created.');
    } finally {
      setBusy(false);
    }
  }

  async function unshare() {
    if (!app.sessionToken) return;
    await api('/v1/shares/current', { method: 'DELETE', token: app.sessionToken });
    setLink(null);
    setCopyCount(0);
  }

  return (
    <Screen
      footer={
        app.sessionToken && app.products.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Button label={link ? 'Update link' : SHARE_STACK_LABEL} disabled={busy} onPress={() => void publish()} />
            {link ? <Button label="Unshare" tone="ghost" onPress={() => void unshare()} /> : null}
          </View>
        ) : null
      }
    >
      <BackButton />
      <T weight="bold" size={32} style={{ letterSpacing: -0.6 }}>
        {SHARE_STACK_LABEL}
      </T>
      <T size={15} color={theme.muted}>
        The link shows products, doses, and the audit score. Prices stay off it.
      </T>
      {app.products.length === 0 ? (
        <Card>
          <T>Add a supplement before sharing.</T>
        </Card>
      ) : null}
      {!app.sessionToken ? (
        <Card>
          <T>Sign in to share your stack.</T>
          <Button label="Sign in" onPress={() => router.push('/sign-in')} />
        </Card>
      ) : null}
      {app.products.length > 0 ? (
        <Card>
          <T size={13} color={theme.muted}>
            Audit score
          </T>
          <T weight="bold" size={40} color={theme.teal} style={{ letterSpacing: -1, lineHeight: 46 }}>
            {String(score)}
          </T>
          <T size={13} color={theme.muted}>
            From doses and overlaps only.
          </T>
          {app.products.map((product) => (
            <View key={product.id} style={{ gap: 2 }}>
              <T weight="semibold">{product.name}</T>
              {product.ingredients.map((ingredient) => (
                <T key={`${product.id}-${ingredient.key}-${ingredient.name}`} size={14} color={theme.muted}>
                  {`${ingredient.name}: ${formatNumber(ingredient.amount)} ${ingredient.unit}`}
                </T>
              ))}
            </View>
          ))}
        </Card>
      ) : null}
      <Card>
        <T weight="semibold">What changed for me</T>
        <T size={13} color={theme.muted}>
          Optional. 1 person, not a trial.
        </T>
        {app.usingSampleData ? (
          <T size={14} color={theme.muted}>
            {EXAMPLE_NOT_PERSONAL}
          </T>
        ) : null}
        {!app.usingSampleData && !realWearable ? (
          <T size={14} color={theme.muted}>
            {NOT_ENOUGH_OUTCOME}
          </T>
        ) : null}
        <Choice label="No personal result" selected={selected === 'none'} onPress={() => setSelected('none')} />
        {previews.map((preview) => (
          <Choice key={preview.metric} label={preview.line} selected={selected === preview.metric} onPress={() => setSelected(preview.metric)} />
        ))}
      </Card>
      <Card>
        <T weight="semibold">Stack name</T>
        <TextInput
          value={stackName}
          onChangeText={setStackName}
          placeholder="Evening magnesium"
          placeholderTextColor={theme.faint}
          accessibilityLabel="Stack name"
          style={{ backgroundColor: theme.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: theme.text }}
        />
        <T weight="semibold">Goals</T>
        <T size={13} color={theme.muted}>
          Up to 3. People can search by these.
        </T>
        {LIBRARY_GOALS.map((goal) => (
          <Choice
            key={goal.key}
            label={goal.label}
            selected={goals.includes(goal.key)}
            onPress={() =>
              setGoals((current) => {
                if (current.includes(goal.key)) return current.filter((item) => item !== goal.key);
                if (current.length >= 3) return current;
                return [...current, goal.key];
              })
            }
          />
        ))}
      </Card>
      <Card>
        <T weight="semibold">Who can find this</T>
        <Choice label="Link only" selected={!publicIndex} onPress={() => setPublicIndex(false)} />
        <T size={13} color={theme.muted}>
          Only people with the link. The page stays out of search engines.
        </T>
        <Choice label="List in Discover" selected={publicIndex} onPress={() => setPublicIndex(true)} />
        <T size={13} color={theme.muted}>
          People can find this stack. The page can be indexed.
        </T>
      </Card>
      {link ? (
        <Card>
          <T weight="semibold">Link</T>
          <T size={14} color={theme.teal}>
            {link}
          </T>
          <T size={14} color={theme.muted}>
            {copyCountLabel(copyCount)}
          </T>
          <Button
            label="Send link"
            tone="ghost"
            onPress={() => void Share.share({ message: link })}
          />
        </Card>
      ) : null}
      {notice ? (
        <T size={14} color={theme.muted}>
          {notice}
        </T>
      ) : null}
    </Screen>
  );
}
