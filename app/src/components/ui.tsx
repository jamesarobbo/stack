import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { applyScreenExit } from '../navigation/exit';
import { DISCLAIMER } from '../config';
import { monthlyCostCents } from '../domain/audit';
import type { ProductInput } from '../domain/types';
import { formatMoney } from '../format';
import { currencyOf } from '../../../shared/money';
import { font, useTheme, useThemedStyles, type Theme } from '../theme';

type Weight = keyof typeof font;

export function T({
  children,
  weight = 'regular',
  size = 16,
  color,
  scale = true,
  style,
}: {
  children: ReactNode;
  weight?: Weight;
  size?: number;
  color?: string;
  /** False only for a numeral sized to a fixed ring or badge. */
  scale?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text
      allowFontScaling={scale}
      style={[{ fontWeight: font[weight], fontSize: size, color: color ?? theme.text, lineHeight: Math.round(size * 1.35) }, style]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(localStyles);
  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, { paddingTop: insets.top + 20, flex: 1 }]}>{children}</View>
  );
  return (
    <View style={styles.screen}>
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    </View>
  );
}

export function Eyebrow({ left, right }: { left: string; right?: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.rowBetween}>
      <T size={13} weight="semibold" color={theme.muted}>
        {left}
      </T>
      {right ? (
        <T size={13} weight="medium" color={theme.muted}>
          {right}
        </T>
      ) : null}
    </View>
  );
}

export function SectionLabel({ label, badge }: { label: string; badge?: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.sectionLabel}>
      <T size={13} weight="semibold" color={theme.muted}>
        {label}
      </T>
      {badge ? <Pill tone="teal">{badge}</Pill> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(localStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({
  children,
  tone = 'grey',
}: {
  children: ReactNode;
  tone?: 'grey' | 'amber' | 'teal' | 'flag' | 'blue';
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const tones = {
    grey: { bg: theme.greyPill, fg: theme.muted },
    amber: { bg: theme.amberPill, fg: theme.amber },
    teal: { bg: theme.tealSoft, fg: theme.teal },
    flag: { bg: theme.flagBg, fg: theme.flagText },
    blue: { bg: theme.tealSoft, fg: theme.teal },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: tones.bg }]}>
      <T size={12} weight="semibold" color={tones.fg}>
        {children}
      </T>
    </View>
  );
}

export function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences';
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <View style={{ gap: 6 }}>
      <T size={13} weight="semibold">
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.field}
      />
    </View>
  );
}

export function EmptyLead({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <T weight="bold" size={32} style={{ letterSpacing: -0.8 }}>
        {title}
      </T>
      <T size={16} color={theme.muted}>
        {body}
      </T>
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'teal',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'teal' | 'ghost';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'ghost' ? styles.buttonGhost : styles.buttonTeal,
        pressed && !disabled ? { opacity: 0.88 } : null,
        disabled ? { opacity: 0.45 } : null,
      ]}
    >
      <T weight="semibold" size={16} color={tone === 'ghost' ? theme.teal : '#fff'}>
        {label}
      </T>
    </Pressable>
  );
}

export function ShareButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const name = Platform.OS === 'android' ? 'share-social-outline' : 'share-outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share stack"
      onPress={onPress}
      hitSlop={8}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={name} size={22} color={theme.teal} />
    </Pressable>
  );
}

export function Disclaimer({ text = DISCLAIMER }: { text?: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.disclaimer}>
      <T size={13} color={theme.muted}>
        {text}
      </T>
    </View>
  );
}

export function BackButton({ label = 'Back', fallback = '/(tabs)/stack' }: { label?: string; fallback?: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => applyScreenExit(router.canGoBack(), () => router.back(), (href) => router.replace(href), fallback)}
      style={styles.back}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={18} color={theme.teal} />
      <T size={15} weight="medium" color={theme.teal}>
        {label}
      </T>
    </Pressable>
  );
}

function Capsule({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 18,
        height: 26,
        borderRadius: 9,
        borderWidth: 1.7,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: 8, height: 1.7, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

export function ProductRow({ product, onPress, last = false }: { product: ProductInput; onPress?: () => void; last?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const monthly = monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.product, last ? styles.productLast : null, pressed ? { opacity: 0.85 } : null]}
    >
      <Capsule color={theme.muted} />
      <View style={{ flex: 1 }}>
        <T weight="semibold" size={16}>
          {product.name}
        </T>
        {product.note ? (
          <T size={13} color={theme.muted}>
            {product.note}
          </T>
        ) : null}
      </View>
      {product.priceCents <= 0 ? (
        <T size={14} color={theme.muted}>
          Add price
        </T>
      ) : (
        <T weight="bold" size={16} color={theme.amber}>
          {formatMoney(monthly, currencyOf(product))}
        </T>
      )}
    </Pressable>
  );
}

export function Boot({ message }: { message: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.boot}>
      <T weight="semibold" size={18}>
        Stack
      </T>
      <T size={14} color={theme.muted} style={{ textAlign: 'center' }}>
        {message}
      </T>
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
    footer: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: theme.bg, gap: 8 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    card: {
      backgroundColor: theme.card,
      borderRadius: theme.radius,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.line,
      gap: 8,
    },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    button: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    field: {
      minHeight: 48,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.text,
    },
    buttonTeal: { backgroundColor: theme.action },
    buttonGhost: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line },
    disclaimer: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.card,
      padding: 14,
    },
    back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: 44 },
    product: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.line,
      minHeight: 56,
    },
    productLast: { borderBottomWidth: 0 },
    boot: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  });
}
