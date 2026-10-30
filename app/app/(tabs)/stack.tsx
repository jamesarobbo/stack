import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Eyebrow, Pill, ProductRow, Screen, T } from '@/src/components/ui';
import { APP_NAME } from '@/src/config';
import { auditStack } from '@/src/domain/audit';
import { formatUsd } from '@/src/format';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

export default function StackScreen() {
  const app = useApp();
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const title = app.displayName.endsWith('s') ? `${app.displayName}' stack` : `${app.displayName}'s stack`;

  return (
    <Screen>
      <Eyebrow left="My stack" right={`${app.products.length} products`} />
      <T weight="bold" size={34} style={styles.title}>
        {title}
      </T>
      <T size={14} color={theme.muted} style={{ marginTop: -8 }}>
        {APP_NAME} adds up what the labels say you pay.
      </T>
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
          <T weight="semibold">Nothing logged yet</T>
          <T size={14} color={theme.muted}>
            Search the NIH label database, scan a barcode, or add a bottle by hand. You can also load the example stack from More.
          </T>
        </Card>
      ) : (
        app.products.map((product) => (
          <ProductRow key={product.id} product={product} onPress={() => router.push(`/product/${product.id}`)} />
        ))
      )}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/add')}>
          <T weight="semibold" color={theme.teal}>
            Add a product
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/scan')}>
          <T weight="semibold" color={theme.teal}>
            Scan a barcode
          </T>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.8, marginTop: 4 },
  spend: { letterSpacing: -1.2, lineHeight: 46 },
  overlapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
});
