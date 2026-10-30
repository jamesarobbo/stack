import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DailyTotal, ScoreReason } from '../domain/auditScore';
import { heroParts, type OutcomeFields } from '../domain/outcome';
import { formatDose } from '../../../shared/doses';
import { theme } from '../theme';
import { T } from './ui';

const NATIVE = Platform.OS !== 'web';

export const tint = {
  slate: '#344054',
  slateDeep: '#1D2939',
  slateSoft: '#F2F4F7',
  tealDeep: '#0A5C50',
  nearBar: '#DC9B04',
  track: '#EEF1F4',
};

export type ScoreTone = 'good' | 'neutral';

/** Matches the link preview image: teal from 80, slate below, so a low score never looks like a success. */
export function scoreTone(score: number): ScoreTone {
  return score >= 80 ? 'good' : 'neutral';
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduced(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Fades and lifts content in on mount. Skipped when the person asked for reduced motion. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const value = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    const run = Animated.timing(value, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE });
    run.start();
    return () => run.stop();
  }, [delay, reduced, value]);
  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return <Animated.View style={[{ opacity: value, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

/**
 * Progress ring without SVG: two half-width clips, each holding a half ring that rotates into view.
 * Keeps the app free of new native modules so it ships over the air.
 */
export function ScoreRing({
  score,
  size = 116,
  stroke = 11,
  color,
  track,
  textColor,
  subColor,
}: {
  score: number;
  size?: number;
  stroke?: number;
  color: string;
  track: string;
  textColor: string;
  subColor: string;
}) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(100, score)) / 100;
  const progress = useState(() => new Animated.Value(0))[0];
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) {
      progress.setValue(target);
      return;
    }
    progress.setValue(0);
    const id = progress.addListener(({ value }) => setShown(Math.round(value * 100)));
    const run = Animated.timing(progress, { toValue: target, duration: 1000, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start();
    return () => {
      run.stop();
      progress.removeListener(id);
    };
  }, [progress, reduced, target]);

  const half = size / 2;
  const right = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-135deg', '45deg', '45deg'] });
  const left = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['45deg', '45deg', '225deg'] });
  const ring = { width: size, height: size, borderRadius: half, borderWidth: stroke };
  const arc = { ...ring, borderTopColor: color, borderRightColor: color, borderBottomColor: 'transparent', borderLeftColor: 'transparent' };

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`Audit score ${score} out of 100`}>
      <View style={[ring, { position: 'absolute', borderColor: track }]} />
      <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={[arc, { position: 'absolute', left: -half, transform: [{ rotate: right }] }]} />
      </View>
      <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={[arc, { position: 'absolute', left: 0, transform: [{ rotate: left }] }]} />
      </View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <T weight="bold" size={size * 0.36} color={textColor} style={{ letterSpacing: -1.5, lineHeight: size * 0.4 }}>
          {String(reduced ? Math.round(target * 100) : shown)}
        </T>
        <T size={11} weight="medium" color={subColor} style={{ marginTop: -2 }}>
          out of 100
        </T>
      </View>
    </View>
  );
}

const REASON_DOT: Record<ScoreReason['kind'], string> = {
  over: '#FDA29B',
  near: '#FEC84B',
  doubled: '#FEC84B',
  overlap_ok: '#A6F4C5',
  unchecked: 'rgba(255,255,255,0.55)',
};

/** The bold score panel. The reasons sit inside it, so the number is never shown without its why. */
export function ScoreHero({
  score,
  summary,
  reasons,
  title = 'Dose audit',
  note = 'From daily totals and overlaps. Price is not part of it.',
}: {
  score: number;
  summary: string;
  reasons: ScoreReason[];
  title?: string;
  note?: string;
}) {
  const tone = scoreTone(score);
  const shown = reasons.filter((reason) => reason.kind !== 'unchecked').slice(0, 5);
  const unchecked = reasons.filter((reason) => reason.kind === 'unchecked');
  return (
    <View style={[styles.hero, { backgroundColor: tone === 'good' ? theme.teal : tint.slate }]}>
      <View style={[styles.heroGlow, { backgroundColor: tone === 'good' ? tint.tealDeep : tint.slateDeep }]} />
      <View style={styles.heroTop}>
        <ScoreRing score={score} color="#FFFFFF" track="rgba(255,255,255,0.2)" textColor="#FFFFFF" subColor="rgba(255,255,255,0.78)" />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={13} weight="semibold" color="rgba(255,255,255,0.78)">
            {title}
          </T>
          <T weight="bold" size={18} color="#FFFFFF" style={{ lineHeight: 23 }}>
            {summary}
          </T>
          <T size={13} color="rgba(255,255,255,0.78)">
            {note}
          </T>
        </View>
      </View>
      {shown.length > 0 ? (
        <View style={styles.reasons}>
          {shown.map((reason) => (
            <View key={`${reason.kind}-${reason.key}`} style={styles.reason}>
              <View style={[styles.dot, { backgroundColor: REASON_DOT[reason.kind] }]} />
              <T size={14} color="#FFFFFF" style={{ flex: 1 }}>
                {reason.text}
              </T>
              {reason.points > 0 ? (
                <T size={13} weight="semibold" color="rgba(255,255,255,0.78)">
                  {`-${reason.points}`}
                </T>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {unchecked.length > 0 ? (
        <T size={12} color="rgba(255,255,255,0.7)">
          {`${unchecked.length} ${unchecked.length === 1 ? 'dose uses a unit' : 'doses use units'} the audit cannot check, so ${unchecked.length === 1 ? 'it is' : 'they are'} left out.`}
        </T>
      ) : null}
    </View>
  );
}

/** Personal before and after result. Neutral colours: a lower number is not called better. */
export function OutcomeHero({
  result,
  who,
}: {
  result: Pick<OutcomeFields, 'direction' | 'percent' | 'withinNormal' | 'device'> & { label: string; disclaimer?: string; framing?: string };
  who?: string | null;
}) {
  const parts = heroParts(result);
  const icon = result.withinNormal || result.direction === 'flat' ? 'remove' : result.direction === 'down' ? 'arrow-down' : 'arrow-up';
  return (
    <View style={styles.outcome}>
      <T size={13} weight="semibold" color={tint.tealDeep}>
        {who ? `What changed for ${who}` : (result.framing ?? 'What changed for me')}
      </T>
      <View style={styles.outcomeRow}>
        <View style={styles.outcomeIcon}>
          <Ionicons name={icon} size={22} color={theme.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={parts.value.length > 5 ? 30 : 40} color={theme.text} style={{ letterSpacing: -1, lineHeight: 46 }}>
            {parts.value}
          </T>
          <T size={15} weight="semibold" color={theme.text}>
            {`${result.label} ${parts.word}`}
          </T>
        </View>
      </View>
      <T size={13} color={theme.muted}>
        {`12 weeks before against 12 weeks after, measured on ${result.device}. ${result.disclaimer ?? '1 person, not a trial'}.`}
      </T>
    </View>
  );
}

export function doseState(ofLimit: number | null): 'ok' | 'near' | 'over' | 'none' {
  if (ofLimit == null) return 'none';
  if (ofLimit > 1) return 'over';
  if (ofLimit >= 0.9) return 'near';
  return 'ok';
}

function Meter({ ofLimit, height = 8 }: { ofLimit: number; height?: number }) {
  const reduced = useReducedMotion();
  const grow = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) {
      grow.setValue(1);
      return;
    }
    const run = Animated.timing(grow, { toValue: 1, duration: 800, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [grow, reduced]);
  const state = doseState(ofLimit);
  const pct = Math.max(4, Math.min(100, Math.round(ofLimit * 100)));
  const width = grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] });
  const color = state === 'over' ? theme.flagText : state === 'near' ? tint.nearBar : theme.teal;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: tint.track, overflow: 'hidden' }}>
      <Animated.View style={{ width, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function DoseMeters({ totals, limit = 10 }: { totals: DailyTotal[]; limit?: number }) {
  return (
    <View style={{ gap: 14 }}>
      {totals.slice(0, limit).map((total) => {
        const state = doseState(total.ofLimit);
        const amount = `${formatDose(total.amount)} ${total.unit}`.trim();
        const pct = total.ofLimit == null ? null : Math.round(total.ofLimit * 100);
        return (
          <View key={total.key} style={{ gap: 6 }}>
            <View style={styles.rowBetween}>
              <T weight="semibold" size={15} style={{ flex: 1 }}>
                {total.name}
              </T>
              <T size={14} color={theme.muted}>
                {`${amount} a day`}
              </T>
            </View>
            {total.ofLimit == null ? (
              <T size={13} color={theme.muted}>
                No upper limit set
              </T>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Meter ofLimit={total.ofLimit} />
                </View>
                <T
                  size={13}
                  weight={state === 'ok' ? 'regular' : 'semibold'}
                  color={state === 'over' ? theme.flagText : state === 'near' ? theme.amber : theme.muted}
                >
                  {`${pct}% of limit`}
                </T>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Compact ingredient strip for Discover cards: up to 4 ingredients with their share of the upper limit. */
export function CompositionStrip({ items }: { items: { name: string; ofLimit: number | null }[] }) {
  const rows = items.slice(0, 4);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      {rows.map((row) => (
        <View key={row.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T size={13} color={theme.text} style={{ width: 110 }}>
            {row.name}
          </T>
          <View style={{ flex: 1 }}>{row.ofLimit == null ? <View style={styles.noLimit} /> : <Meter ofLimit={row.ofLimit} height={6} />}</View>
        </View>
      ))}
    </View>
  );
}

/** Square score badge for list rows. */
export function ScoreBadge({ score, size = 56 }: { score: number; size?: number }) {
  const tone = scoreTone(score);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: tone === 'good' ? theme.teal : tint.slate,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessible
      accessibilityLabel={`Audit score ${score} out of 100`}
    >
      <T weight="bold" size={size * 0.4} color="#FFFFFF" style={{ letterSpacing: -0.8, lineHeight: size * 0.46 }}>
        {String(score)}
      </T>
    </View>
  );
}

/** What the link preview image will look like, drawn with Views so it matches without rendering a PNG on the phone. */
export function ShareCardPreview({
  stackName,
  creator,
  productCount,
  score,
  summary,
  composition,
}: {
  stackName: string;
  creator: string;
  productCount: number;
  score: number;
  summary: string;
  composition: { name: string; ofLimit: number | null }[];
}) {
  const tone = scoreTone(score);
  return (
    <View style={styles.preview} accessibilityLabel="Link preview">
      <View style={styles.previewBar} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1.25, gap: 6, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.mark}>
              <View style={[styles.markLine, { opacity: 1 }]} />
              <View style={[styles.markLine, { opacity: 0.8 }]} />
              <View style={[styles.markLine, { opacity: 0.6 }]} />
            </View>
            <T weight="bold" size={12}>
              Stack
            </T>
          </View>
          <T weight="bold" size={17} style={{ letterSpacing: -0.4, lineHeight: 21 }}>
            {stackName}
          </T>
          <T size={11} color={theme.muted}>
            {`${creator}, ${productCount} ${productCount === 1 ? 'product' : 'products'}`}
          </T>
          <View style={{ gap: 5, marginTop: 4 }}>
            {composition.slice(0, 3).map((row) => (
              <View key={row.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T size={10} style={{ width: 62 }}>
                  {row.name}
                </T>
                <View style={{ flex: 1 }}>{row.ofLimit == null ? <View style={styles.noLimit} /> : <Meter ofLimit={row.ofLimit} height={5} />}</View>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.previewPanel, { backgroundColor: tone === 'good' ? theme.teal : tint.slate }]}>
          <ScoreRing score={score} size={74} stroke={7} color="#FFFFFF" track="rgba(255,255,255,0.2)" textColor="#FFFFFF" subColor="rgba(255,255,255,0.78)" />
          <T size={10} weight="semibold" color="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
            {summary}
          </T>
        </View>
      </View>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected ? styles.chipOn : null, pressed ? { opacity: 0.85 } : null]}
    >
      <T size={13} weight="semibold" color={selected ? '#FFFFFF' : theme.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Segmented<K extends string>({ items, value, onChange }: { items: readonly { key: K; label: string }[]; value: K; onChange: (key: K) => void }) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {items.map((item) => {
        const on = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(item.key)}
            style={[styles.segment, on ? styles.segmentOn : null]}
          >
            <T size={13} weight="semibold" color={on ? theme.text : theme.muted} style={{ textAlign: 'center' }}>
              {item.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggle, pressed ? { opacity: 0.9 } : null]}
    >
      <View style={[styles.box, value ? styles.boxOn : null]}>{value ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="semibold" size={15}>
          {label}
        </T>
        {detail ? (
          <T size={13} color={theme.muted}>
            {detail}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

export function IconAction({ icon, label, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconAction, active ? { backgroundColor: theme.tealSoft, borderColor: theme.tealSoft } : null, pressed ? { opacity: 0.85 } : null]}
    >
      <Ionicons name={icon} size={18} color={theme.teal} />
      <T size={13} weight="semibold" color={theme.teal}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  hero: { borderRadius: 22, padding: 18, gap: 14, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -150, bottom: -170, opacity: 0.55 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reasons: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 12, gap: 8 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  outcome: { backgroundColor: theme.tealSoft, borderRadius: 20, padding: 18, gap: 10 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  outcomeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  noLimit: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#D0D5DD' },
  preview: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEF0F3', padding: 12, paddingTop: 16, overflow: 'hidden' },
  previewBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: theme.teal },
  previewPanel: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mark: { width: 16, height: 16, borderRadius: 5, backgroundColor: theme.teal, justifyContent: 'center', paddingHorizontal: 3, gap: 1.5 },
  markLine: { height: 2.5, borderRadius: 1.25, backgroundColor: '#FFFFFF' },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E7EC' },
  chipOn: { backgroundColor: theme.teal, borderColor: theme.teal },
  segmented: { flexDirection: 'row', backgroundColor: '#E9ECF0', borderRadius: 12, padding: 3, gap: 2 },
  segment: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 9, justifyContent: 'center' },
  segmentOn: { backgroundColor: '#FFFFFF', shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  toggle: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#C9CFD8', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: theme.teal, borderColor: theme.teal },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
});
