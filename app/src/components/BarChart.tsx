import { StyleSheet, View } from 'react-native';
import { bucketMeans } from '../domain/impact';
import { theme } from '../theme';
import { T } from './ui';

export function BarChart({
  baseline,
  after,
  title,
}: {
  baseline: number[];
  after: number[];
  title: string;
}) {
  const left = bucketMeans(baseline, 6);
  const right = bucketMeans(after, 6);
  const max = Math.max(1, ...left, ...right);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <T weight="semibold" size={15}>
          {title}
        </T>
        <T size={12} color={theme.muted}>
          Baseline and after
        </T>
      </View>
      <View style={styles.plot}>
        {left.map((value, index) => (
          <View key={`b-${index}`} style={[styles.bar, { height: Math.max(8, (value / max) * 128), backgroundColor: '#D5D8DE' }]} />
        ))}
        <View style={{ width: 14 }} />
        {right.map((value, index) => (
          <View key={`a-${index}`} style={[styles.bar, { height: Math.max(8, (value / max) * 128), backgroundColor: theme.teal }]} />
        ))}
      </View>
      <View style={styles.labels}>
        <T size={12} color={theme.muted}>
          Baseline
        </T>
        <T size={12} color={theme.muted}>
          After start
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plot: { height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 7 },
  bar: { width: 14, borderRadius: 5 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
});
