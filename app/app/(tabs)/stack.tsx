import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottleShelf, EmptyBottles } from '@/src/components/illustrations';
import { ScoreBadge } from '@/src/components/share';
import { Button, Card, Pill, ProductRow, T } from '@/src/components/ui';
import { APP_NAME } from '@/src/config';
import { ADD_SUPPLEMENT_LABEL, ADD_SUPPLEMENT_ROUTE, stackHeading } from '@/src/copy/labels';
import { SHARE_STACK_LABEL } from '@/src/copy/sharing';
import { auditStack } from '@/src/domain/audit';
import { scoreProducts } from '@/src/domain/auditScore';
import { formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function StackScreen() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const scored = useMemo(() => scoreProducts(app.products), [app.products]);
  const title = stackHeading(app.displayName);
  const openAdd = () => router.push(ADD_SUPPLEMENT_ROUTE);

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <BottleShelf />
      </View>
      <View style={styles.header}>
        <T weight="bold" size={34} style={styles.title}>
          {title}
        </T>
        <T size={14} color={theme.muted}>
          {APP_NAME} adds up what the labels say you pay.
        </T>
        {app.products.length > 0 ? (
          <View style={styles.links}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/share')} style={styles.link}>
              <T size={15} weight="semibold" color={theme.teal}>
                {SHARE_STACK_LABEL}
              </T>
            </Pressable>
          </View>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <T size={13} color={theme.muted}>
            Estimated monthly spend
          </T>
          <T weight="bold" size={44} style={styles.spend}>
            {formatUsd(audit.monthlySpendCents)}
          </T>
          {audit.duplicates.length > 0 ? (
            <View style={styles.overlapRow}>
              <Pill tone="amber">{`${audit.duplicates.length} overlaps`}</Pill>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/audit')} style={styles.link}>
                <T size={14} weight="semibold" color={theme.teal}>
                  View in Audit
                </T>
              </Pressable>
            </View>
          ) : null}
          {app.products.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/audit')} style={styles.scoreRow}>
              <ScoreBadge score={scored.score} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <T weight="semibold">Dose audit</T>
                <T size={13} color={theme.muted}>
                  {scored.summary}
                </T>
              </View>
            </Pressable>
          ) : null}
        </Card>
        {app.products.length === 0 ? (
          <Card>
            <EmptyBottles />
            <T weight="semibold" size={18}>
              Nothing in your stack yet
            </T>
            <T size={14} color={theme.muted}>
              Search the NIH label database, scan a barcode, or add a bottle by hand. The bar below is the way to add one.
            </T>
          </Card>
        ) : (
          app.products.map((product) => (
            <ProductRow key={product.id} product={product} onPress={() => router.push(`/product/${product.id}`)} />
          ))
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={ADD_SUPPLEMENT_LABEL} onPress={openAdd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 4 },
  title: { letterSpacing: -0.8 },
  links: { flexDirection: 'row', gap: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 14 },
  spend: { letterSpacing: -1.5, lineHeight: 50 },
  overlapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 12,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },
});
