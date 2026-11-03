import { StyleSheet, View } from 'react-native';
import { bucketMeans } from '../domain/impact';
import { radius, space, useTheme, useThemedStyles, type Theme } from '../theme';
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
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
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
          <View key={`b-${index}`} style={[styles.bar, { height: Math.max(8, (value / max) * 128), backgroundColor: theme.scoreTrack }]} />
        ))}
        <View style={{ width: 14 }} />
        {right.map((value, index) => (
          <View key={`a-${index}`} style={[styles.bar, { height: Math.max(8, (value / max) * 128), backgroundColor: theme.sleep }]} />
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

function localStyles(theme: Theme) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: space.lg,
    borderWidth: 1,
    borderColor: theme.line,
    gap: space.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plot: { height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.sm },
  bar: { width: 14, borderRadius: radius.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.sm },
});
}

