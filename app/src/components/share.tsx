import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DailyTotal, ScoreReason } from '../domain/auditScore';
import { heroParts, type OutcomeFields } from '../domain/outcome';
import { formatDose } from '../../../shared/doses';
import { PERSONAL_RESULT_NOTE } from '../../../shared/outcome';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { NativeSegmented } from './NativeSegmented';
import { T } from './ui';

const NATIVE = Platform.OS !== 'web';

export type ScoreTone = 'good' | 'neutral';

/** Matches the posted image: green from 80, warm charcoal below, so a low score never looks like a success. */
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
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  color: string;
  track: string;
  textColor: string;
  subColor: string;
  label?: string;
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
    <View style={{ width: size, height: size }} accessible accessibilityLabel={label ?? `Dose score ${score} out of 100, from doses and overlaps, not price.`}>
      <View style={[ring, { position: 'absolute', borderColor: track }]} />
      <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={[arc, { position: 'absolute', left: -half, transform: [{ rotate: right }] }]} />
      </View>
      <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={[arc, { position: 'absolute', left: 0, transform: [{ rotate: left }] }]} />
      </View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <T scale={false} weight="bold" size={size * 0.36} color={textColor} style={{ letterSpacing: -1.5, lineHeight: size * 0.4 }}>
          {String(reduced ? Math.round(target * 100) : shown)}
        </T>
        {size >= 100 ? (
          <T scale={false} size={11} weight="medium" color={subColor} style={{ marginTop: -2 }}>
            out of 100
          </T>
        ) : null}
      </View>
    </View>
  );
}

/** The score sits on a card with its reasons, so the number is never shown without its why. */
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
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const tone = scoreTone(score);
  const shown = reasons.filter((reason) => reason.kind !== 'unchecked').slice(0, 5);
  const unchecked = reasons.filter((reason) => reason.kind === 'unchecked');
  const ring = tone === 'good' ? theme.good : theme.score;
  const reasonDot: Record<ScoreReason['kind'], string> = {
    over: theme.flagText,
    near: theme.near,
    doubled: theme.score,
    overlap_ok: theme.teal,
    unchecked: theme.muted,
  };
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <ScoreRing
          score={score}
          color={ring}
          track={theme.scoreTrack}
          textColor={theme.text}
          subColor={theme.muted}
          label={`Dose score ${score} out of 100, from doses and overlaps, not price.`}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={13} weight="semibold" color={theme.muted}>
            {title}
          </T>
          <T weight="bold" size={18} color={theme.text} style={{ lineHeight: 23 }}>
            {summary}
          </T>
          <T size={13} color={theme.muted}>
            {note}
          </T>
        </View>
      </View>
      {shown.length > 0 ? (
        <View style={styles.reasons}>
          {shown.map((reason) => (
            <View key={`${reason.kind}-${reason.key}`} style={styles.reason}>
              <View style={[styles.dot, { backgroundColor: reasonDot[reason.kind] }]} />
              <T size={14} color={theme.text} style={{ flex: 1 }}>
                {reason.text}
              </T>
              {reason.points > 0 ? (
                <T size={13} weight="semibold" color={theme.muted}>
                  {`-${reason.points}`}
                </T>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {unchecked.length > 0 ? (
        <T size={12} color={theme.muted}>
          {`${unchecked.length} ${unchecked.length === 1 ? 'dose uses a unit' : 'doses use units'} the audit cannot check, so ${unchecked.length === 1 ? 'it is' : 'they are'} left out.`}
        </T>
      ) : null}
    </View>
  );
}

type LineWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/** Superscript star, about 70% of the line, in the same colour. Not a control. */
function MarkedLine({
  line,
  size,
  weight = 'regular',
  color,
  align = 'left',
}: {
  line: string;
  size: number;
  weight?: LineWeight;
  color?: string;
  align?: 'left' | 'right';
}) {
  const theme = useTheme();
  const ink = color ?? theme.text;
  const star = Math.max(8, Math.round(size * 0.7));
  const raise = Math.max(2, Math.round(size * 0.28));
  return (
    <T size={size} weight={weight} color={ink} style={align === 'right' ? { textAlign: 'right' } : undefined}>
      {line}
      <T size={star} weight={weight} color={ink} style={{ lineHeight: star, transform: [{ translateY: -raise }] }}>
        *
      </T>
    </T>
  );
}

/** A result line marked with a star. The star is plain text. The label speaks the caveat. */
export function ResultLine({
  line,
  note,
  size = 14,
  weight = 'regular',
  color,
  align = 'left',
}: {
  line: string;
  note: string;
  size?: number;
  weight?: LineWeight;
  color?: string;
  align?: 'left' | 'right';
}) {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${line}*. ${note}`} style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <MarkedLine line={line} size={size} weight={weight} color={color} align={align} />
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
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const parts = heroParts(result);
  const icon = result.withinNormal || result.direction === 'flat' ? 'remove' : result.direction === 'down' ? 'arrow-down' : 'arrow-up';
  return (
    <View style={styles.outcome}>
      <T size={13} weight="semibold" color={theme.muted}>
        {who ? `What changed for ${who}` : (result.framing ?? 'What changed for me')}
      </T>
      <View style={{ gap: 10 }}>
        <View style={styles.outcomeRow}>
          <View style={styles.outcomeIcon}>
            <Ionicons name={icon} size={22} color={theme.teal} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T weight="bold" size={parts.value.length > 5 ? 36 : 52} color={theme.text} style={{ letterSpacing: -1.5, lineHeight: 58 }}>
              {parts.value}
            </T>
            <ResultLine line={`${result.label} ${parts.word}`} note={PERSONAL_RESULT_NOTE} size={15} weight="semibold" />
          </View>
        </View>
        <T size={13} color={theme.muted}>
          {`12 weeks before against 12 weeks after, measured on ${result.device}.`}
        </T>
      </View>
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
  const theme = useTheme();
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
  const color = state === 'over' ? theme.flagText : state === 'near' ? theme.near : theme.action;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: theme.scoreTrack, overflow: 'hidden' }}>
      <Animated.View style={{ width, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function DoseMeters({ totals, limit = 10 }: { totals: DailyTotal[]; limit?: number }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
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
                  color={state === 'over' ? theme.flagText : state === 'near' ? theme.near : theme.muted}
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
export function CompositionStrip({ items, height = 8 }: { items: { name: string; ofLimit: number | null }[]; height?: number }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const rows = items.slice(0, 4);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => {
        const state = doseState(row.ofLimit);
        const pct = row.ofLimit == null ? null : Math.round(row.ofLimit * 100);
        return (
          <View key={row.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T size={13} color={theme.text} style={{ width: 108 }}>
              {row.name}
            </T>
            <View style={{ flex: 1 }}>{row.ofLimit == null ? <View style={styles.noLimit} /> : <Meter ofLimit={row.ofLimit} height={height} />}</View>
            <T size={12} weight={state === 'over' ? 'semibold' : 'regular'} color={state === 'over' ? theme.flagText : theme.muted} style={{ width: 44, textAlign: 'right' }}>
              {pct == null ? ' ' : `${pct}%`}
            </T>
          </View>
        );
      })}
    </View>
  );
}

/** Square score badge for list rows. */
export function ScoreBadge({ score, size = 56 }: { score: number; size?: number }) {
  const theme = useTheme();
  const tone = scoreTone(score);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: tone === 'good' ? theme.goodFill : theme.neutralFill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessible
      accessibilityLabel={`Dose score ${score} out of 100, from doses and overlaps, not price.`}
    >
      <T scale={false} weight="bold" size={size * 0.4} color="#FFFFFF" style={{ letterSpacing: -0.8, lineHeight: size * 0.46 }}>
        {String(score)}
      </T>
    </View>
  );
}

export type CardResult = { value: string; word: string; label: string; device: string; disclaimer: string; kicker: string };

function resultWindow(result: CardResult): string {
  return `12 weeks before against 12 weeks after, measured on ${result.device}.`;
}

/** What the link preview image will look like, drawn with Views so it matches without rendering a PNG on the phone. */
export function ShareCardPreview({
  stackName,
  creator,
  productCount,
  score,
  summary,
  composition,
  result,
  spend,
}: {
  stackName: string;
  creator: string;
  productCount: number;
  score: number;
  summary: string;
  composition: { name: string; ofLimit: number | null }[];
  result?: CardResult | null;
  spend?: string | null;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const tone = scoreTone(score);
  return (
    <View style={styles.preview} accessibilityLabel="Link preview" accessibilityHint={result?.disclaimer}>
      <BrandMark />
      <T weight="bold" size={22} style={{ letterSpacing: -0.5, lineHeight: 26 }}>
        {stackName}
      </T>
      <T size={13} color={theme.muted}>
        {`${creator}, ${productCount} ${productCount === 1 ? 'product' : 'products'}`}
      </T>
      {spend ? (
        <T size={13} weight="bold" color={theme.amber}>
          {spend}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
        <View style={{ flex: 1.15, gap: 8, justifyContent: 'center' }}>
          {result ? (
            <View style={styles.previewResult}>
              <T weight="bold" size={28} style={{ letterSpacing: -1, lineHeight: 32 }}>
                {result.value}
              </T>
              <MarkedLine line={`${result.label} ${result.word}`} size={13} weight="semibold" />
              <T size={12} color={theme.muted}>
                {resultWindow(result)}
              </T>
              <T size={12} color={theme.muted}>
                {`* ${result.disclaimer}`}
              </T>
            </View>
          ) : null}
          {composition.slice(0, result ? 3 : 4).map((row) => (
            <View key={row.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={12} style={{ width: 72 }}>
                {row.name}
              </T>
              <View style={{ flex: 1 }}>{row.ofLimit == null ? <View style={styles.noLimit} /> : <Meter ofLimit={row.ofLimit} height={7} />}</View>
            </View>
          ))}
        </View>
        <View style={styles.previewPanel}>
          <ScoreRing score={score} size={86} stroke={8} color={tone === 'good' ? theme.good : theme.score} track={theme.scoreTrack} textColor={theme.text} subColor={theme.muted} />
          <T size={11} weight="semibold" color={theme.muted}>
            Dose score
          </T>
          <T size={12} weight="semibold" style={{ textAlign: 'center' }}>
            {summary}
          </T>
        </View>
      </View>
      <T weight="bold" size={14} color={theme.teal}>
        Check your stack against this one
      </T>
    </View>
  );
}

/** Story sized card, 9:16, for a post. Same facts as the link preview, with room for the headline. */
export function StoryCardPreview({
  stackName,
  creator,
  productCount,
  score,
  summary,
  composition,
  result,
  spend,
}: {
  stackName: string;
  creator: string;
  productCount: number;
  score: number;
  summary: string;
  composition: { name: string; ofLimit: number | null }[];
  result?: CardResult | null;
  spend?: string | null;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const tone = scoreTone(score);
  return (
    <View style={styles.story} accessibilityLabel="Story card" accessibilityHint={result?.disclaimer}>
      <BrandMark size={22} />
      <T weight="bold" size={28} style={{ letterSpacing: -0.8, lineHeight: 32 }}>
        {stackName}
      </T>
      <T size={14} color={theme.muted}>
        {`${creator}, ${productCount} ${productCount === 1 ? 'product' : 'products'}`}
      </T>
      {spend ? (
        <T size={15} weight="bold" color={theme.amber}>
          {spend}
        </T>
      ) : null}
      <View style={styles.storyPanel}>
        <ScoreRing score={score} size={120} stroke={11} color={tone === 'good' ? theme.good : theme.score} track={theme.scoreTrack} textColor={theme.text} subColor={theme.muted} />
        <T size={13} weight="semibold" color={theme.muted}>
          Dose score
        </T>
        <T size={16} weight="bold" style={{ textAlign: 'center' }}>
          {summary}
        </T>
      </View>
      {result ? (
        <View style={styles.storyResult}>
          <T size={13} weight="bold" color={theme.muted}>
            {result.kicker}
          </T>
          <T weight="bold" size={48} style={{ letterSpacing: -1.5, lineHeight: 52 }}>
            {result.value}
          </T>
          <MarkedLine line={`${result.label} ${result.word}`} size={16} weight="semibold" />
          <T size={13} color={theme.muted}>
            {resultWindow(result)}
          </T>
          <T size={13} color={theme.muted}>
            {`* ${result.disclaimer}`}
          </T>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        {composition.slice(0, 4).map((row) => {
          const state = doseState(row.ofLimit);
          const pct = row.ofLimit == null ? null : Math.round(row.ofLimit * 100);
          return (
            <View key={row.name} style={{ gap: 4 }}>
              <View style={styles.rowBetween}>
                <T size={13} weight="semibold" style={{ flex: 1 }}>
                  {row.name}
                </T>
                <T size={12} weight={state === 'over' ? 'semibold' : 'regular'} color={state === 'over' ? theme.flagText : theme.muted}>
                  {pct == null ? 'No upper limit' : `${pct}%`}
                </T>
              </View>
              {row.ofLimit == null ? null : <Meter ofLimit={row.ofLimit} height={8} />}
            </View>
          );
        })}
      </View>
      <View style={styles.storyCta}>
        <T weight="bold" size={15} color="#FFFFFF" style={{ textAlign: 'center' }}>
          Check your stack against this one
        </T>
      </View>
    </View>
  );
}

export function BrandMark({ size = 18 }: { size?: number }) {
  const theme = useTheme();
  const line = Math.max(2, Math.round(size * 0.14));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel="Stack">
      <View
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: theme.mark,
          justifyContent: 'center',
          paddingHorizontal: Math.round(size * 0.2),
          gap: Math.max(1, Math.round(size * 0.08)),
        }}
      >
        <View style={{ height: line, borderRadius: line / 2, backgroundColor: '#FFFFFF' }} />
        <View style={{ height: line, borderRadius: line / 2, backgroundColor: '#FFFFFF', opacity: 0.8 }} />
        <View style={{ height: line, borderRadius: line / 2, backgroundColor: '#FFFFFF', opacity: 0.6 }} />
      </View>
      <T weight="bold" size={Math.round(size * 0.85)}>
        Stack
      </T>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
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
  return <NativeSegmented items={items} value={value} onChange={onChange} />;
}

export function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (next: boolean) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.toggle}>
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
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.greyPill, true: theme.action }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.greyPill}
      />
    </View>
  );
}

export function IconAction({ icon, label, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
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

function localStyles(theme: Theme) {
  return StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  hero: { borderRadius: 12, padding: 18, gap: 14, overflow: 'hidden', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line },
  heroGlow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -150, bottom: -170, opacity: 0.55 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reasons: { borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 12, gap: 8 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  outcome: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 18, gap: 10 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  outcomeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
  noLimit: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: theme.line },
  preview: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.line, padding: 16, paddingTop: 18, gap: 8, overflow: 'hidden' },
  previewPanel: { width: 132, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  previewGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, right: -70, bottom: -80, opacity: 0.55 },
  previewResult: { backgroundColor: theme.bg, borderRadius: 12, padding: 10, gap: 2 },
  story: { backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.line, padding: 18, paddingTop: 22, gap: 10, overflow: 'hidden', aspectRatio: 9 / 16, justifyContent: 'space-between' },
  storyPanel: { borderRadius: 12, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', backgroundColor: theme.card },
  storyResult: { backgroundColor: theme.card, borderRadius: 12, padding: 14, gap: 2 },
  storyCta: { backgroundColor: theme.action, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line },
  chipOn: { backgroundColor: theme.action, borderColor: theme.action },
  segmented: { flexDirection: 'row', backgroundColor: theme.segmentTrack, borderRadius: 12, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 38, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 9, justifyContent: 'center' },
  segmentOn: { backgroundColor: theme.segmentOn },
  toggle: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: theme.action, borderColor: theme.action },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
  },
});
}

