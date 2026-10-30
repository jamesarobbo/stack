import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Eyebrow, Pill, ProductRow, T } from '@/src/components/ui';
import { APP_NAME } from '@/src/config';
import { ADD_BUTTON_LABEL, ADD_SUPPLEMENT_LABEL, ADD_SUPPLEMENT_ROUTE, stackHeading } from '@/src/copy/labels';
import { auditStack } from '@/src/domain/audit';
import { formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function StackScreen() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const title = stackHeading(app.displayName);
  const openAdd = () => router.push(ADD_SUPPLEMENT_ROUTE);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Eyebrow left="My stack" right={app.products.length === 1 ? '1 product' : `${app.products.length} products`} />
        <View style={styles.titleRow}>
          <T weight="bold" size={34} style={styles.title}>
            {title}
          </T>
          <Pressable accessibilityRole="button" accessibilityLabel={ADD_SUPPLEMENT_LABEL} onPress={openAdd} style={styles.add}>
            <Ionicons name="add" size={18} color="#fff" />
            <T weight="semibold" size={15} color="#fff">
              {ADD_BUTTON_LABEL}
            </T>
          </Pressable>
        </View>
        <T size={14} color={theme.muted}>
          {APP_NAME} adds up what the labels say you pay.
        </T>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <T size={13} color={theme.muted}>
            Estimated monthly spend
          </T>
          <T weight="bold" size={40} style={styles.spend}>
            {formatUsd(audit.monthlySpendCents)}
          </T>
          {audit.duplicates.length > 0 ? (
            <View style={styles.overlapRow}>
              <Pill tone="amber">{`${audit.duplicates.length} overlaps`}</Pill>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/audit')}>
                <T size={14} weight="semibold" color={theme.teal}>
                  View in Audit
                </T>
              </Pressable>
            </View>
          ) : null}
        </Card>
        {app.products.length === 0 ? (
          <Card>
            <T weight="semibold">Nothing in your stack yet</T>
            <T size={14} color={theme.muted}>
              Search the NIH label database, scan a barcode, or add a bottle by hand.
            </T>
            <Button label="Add a supplement" onPress={openAdd} />
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
  header: { paddingHorizontal: 20, paddingBottom: 8, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { letterSpacing: -0.8, flex: 1 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.teal,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 14 },
  spend: { letterSpacing: -1.2, lineHeight: 46 },
  overlapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },
});
