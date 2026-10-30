import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BackButton, Button, Card, Disclaimer, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import {
  COPIED_CREDIT_FALLBACK,
  DOCTOR_LINE,
  PEOPLE_LIKE_YOU_EMPTY,
  copyCountLabel,
} from '@/src/copy/sharing';
import { formatNumber } from '@/src/format';
import { isAgeRange, isSex } from '@/src/health/demographics';
import { localToday } from '@/src/dates';
import { getSetting } from '@/src/settings';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

type SharedIngredient = { key?: string; name: string; amount: number; unit: string };
type SharedProduct = {
  name: string;
  brand: string;
  servingsPerDay: number;
  servingsPerContainer?: number;
  ingredients: SharedIngredient[];
};
type SharedResult = { framing: string; line: string; disclaimer: string } | null;
type SharedAggregate = { line: string; disclaimer: string; cohort: string } | null;
type SharedStack = {
  displayName: string | null;
  products: SharedProduct[];
  auditScore: number;
  result: SharedResult;
  copyCount: number;
  aggregate: SharedAggregate;
};

export default function SharedStackScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const app = useApp();
  const [stack, setStack] = useState<SharedStack | null>(null);
  const [missing, setMissing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [likeYou, setLikeYou] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    void api<SharedStack>(`/v1/shares/${slug}`)
      .then(setStack)
      .catch(() => setMissing(true));
  }, [slug]);

  async function copyStack() {
    if (!slug) return;
    if (!app.sessionToken) {
      router.push('/sign-in');
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const copied = await api<{
        alreadyCopied: boolean;
        credit: string;
        products: (SharedProduct & { servingsPerContainer: number; ingredients: (SharedIngredient & { key: string })[] })[];
      }>(`/v1/shares/${slug}/copy`, { method: 'POST', token: app.sessionToken });
      if (!copied.alreadyCopied) {
        for (const product of copied.products) {
          await app.addManual({
            name: product.name,
            brand: product.brand || null,
            note: copied.credit || COPIED_CREDIT_FALLBACK,
            priceCents: 0,
            servingsPerContainer: product.servingsPerContainer || 30,
            servingsPerDay: product.servingsPerDay,
            startDate: localToday(),
            ingredients: product.ingredients.map((ingredient) => ({
              key: ingredient.key || ingredient.name,
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              costWeight: 1,
            })),
          });
        }
      }
      setNote(copied.alreadyCopied ? 'You already copied this stack.' : 'Copied. Add the prices you pay.');
      const refreshed = await api<SharedStack>(`/v1/shares/${slug}`);
      setStack(refreshed);
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'The stack could not be copied.');
    } finally {
      setBusy(false);
    }
  }

  async function peopleLikeYou() {
    if (!slug) return;
    const ageRange = getSetting('ageRange');
    const sex = getSetting('sex');
    if (!isAgeRange(ageRange) || !isSex(sex) || ageRange === 'unspecified' || sex === 'unspecified') {
      setLikeYou('Add an age range and sex to compare with people like you.');
      return;
    }
    const body = await api<{ aggregate: SharedAggregate }>(`/v1/shares/${slug}/aggregate?ageRange=${ageRange}&sex=${sex}`);
    setLikeYou(body.aggregate ? `${body.aggregate.line} ${body.aggregate.disclaimer}` : PEOPLE_LIKE_YOU_EMPTY);
  }

  if (missing) {
    return (
      <Screen>
        <BackButton />
        <T weight="semibold">This stack is no longer shared.</T>
      </Screen>
    );
  }

  if (!stack) {
    return (
      <Screen>
        <BackButton />
        <T color={theme.muted}>Loading shared stack</T>
      </Screen>
    );
  }

  const who = stack.displayName || 'A Stack user';
  return (
    <Screen footer={<Button label={app.sessionToken ? 'Copy to my stack' : 'Sign in to copy'} disabled={busy} onPress={() => void copyStack()} />}>
      <BackButton />
      <T weight="bold" size={32} style={{ letterSpacing: -0.6 }}>
        Shared stack
      </T>
      <T size={15} color={theme.muted}>
        {who}
      </T>
      <Card>
        <T size={13} color={theme.muted}>
          Audit score
        </T>
        <T weight="bold" size={40} color={theme.teal} style={{ letterSpacing: -1, lineHeight: 46 }}>
          {String(stack.auditScore)}
        </T>
        <T size={13} color={theme.muted}>
          From doses and overlaps only.
        </T>
      </Card>
      {stack.products.map((product) => (
        <Card key={`${product.name}-${product.brand}`}>
          <T weight="semibold">{product.name}</T>
          {product.brand ? (
            <T size={13} color={theme.muted}>
              {product.brand}
            </T>
          ) : null}
          {product.ingredients.map((ingredient) => (
            <T key={`${ingredient.name}-${ingredient.unit}`} size={14} color={theme.muted}>
              {`${ingredient.name}: ${formatNumber(ingredient.amount)} ${ingredient.unit}`}
            </T>
          ))}
          <T size={13} color={theme.muted}>
            {`${product.servingsPerDay} a day`}
          </T>
        </Card>
      ))}
      {stack.result ? (
        <Card>
          <T weight="semibold">{stack.result.framing}</T>
          <T>{stack.result.line}</T>
          <T size={13} color={theme.muted}>
            {stack.result.disclaimer}
          </T>
        </Card>
      ) : null}
      <T size={14} color={theme.muted}>
        {copyCountLabel(stack.copyCount)}
      </T>
      {stack.aggregate ? (
        <Card>
          <T weight="semibold">People who copied this</T>
          <T>{stack.aggregate.line}</T>
          <T size={13} color={theme.muted}>
            {stack.aggregate.disclaimer}
          </T>
        </Card>
      ) : null}
      <View style={{ gap: 8 }}>
        <Button label="People like you" tone="ghost" onPress={() => void peopleLikeYou()} />
        {likeYou ? (
          <T size={14} color={theme.muted}>
            {likeYou}
          </T>
        ) : null}
      </View>
      {note ? (
        <T size={14} color={theme.muted}>
          {note}
        </T>
      ) : null}
      <T>{DOCTOR_LINE}</T>
      <Disclaimer />
    </Screen>
  );
}
