import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DISCLAIMER } from '../config';
import { monthlyCostCents } from '../domain/audit';
import type { ProductInput } from '../domain/types';
import { formatUsd } from '../format';
import { font, theme } from '../theme';

type Weight = keyof typeof font;

export function T({
  children,
  weight = 'regular',
  size = 16,
  color = theme.text,
  style,
}: {
  children: ReactNode;
  weight?: Weight;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[{ fontFamily: font[weight], fontSize: size, color, lineHeight: Math.round(size * 1.35) }, style]}>{children}</Text>;
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
  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, { paddingTop: insets.top + 12, flex: 1 }]}>{children}</View>
  );
  return (
    <View style={styles.screen}>
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    </View>
  );
}

export function Eyebrow({ left, right }: { left: string; right?: string }) {
  return (
    <View style={styles.rowBetween}>
      <T size={12} weight="semibold" color={theme.muted} style={styles.eyebrow}>
        {left}
      </T>
      {right ? (
        <T size={12} weight="semibold" color={theme.faint} style={styles.eyebrow}>
          {right}
        </T>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({
  children,
  tone = 'grey',
}: {
  children: ReactNode;
  tone?: 'grey' | 'amber' | 'teal' | 'flag' | 'blue';
}) {
  const tones = {
    grey: { bg: theme.greyPill, fg: theme.muted },
    amber: { bg: theme.amberPill, fg: theme.amber },
    teal: { bg: theme.tealSoft, fg: theme.teal },
    flag: { bg: theme.flagBg, fg: theme.flagText },
    blue: { bg: '#E8F0FE', fg: theme.blue },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: tones.bg }]}>
      <T size={12} weight="semibold" color={tones.fg}>
        {children}
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

export function Disclaimer({ text = DISCLAIMER }: { text?: string }) {
  return (
    <View style={styles.disclaimer}>
      <T size={13} color={theme.muted}>
        {text}
      </T>
    </View>
  );
}

export function BackButton({ label = 'Back' }: { label?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={8}>
      <Ionicons name="chevron-back" size={18} color={theme.teal} />
      <T size={15} weight="medium" color={theme.teal}>
        {label}
      </T>
    </Pressable>
  );
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  nmn: 'flask-outline',
  tmg: 'leaf-outline',
  resveratrol: 'water-outline',
  magnesium: 'moon-outline',
  'vitamin-d': 'sunny-outline',
  'b-complex': 'grid-outline',
  'vitamin-b6': 'grid-outline',
  creatine: 'barbell-outline',
  'omega-3': 'fish-outline',
  default: 'ellipse-outline',
};

export function productIcon(product: ProductInput): keyof typeof Ionicons.glyphMap {
  const key = product.ingredients[0]?.key ?? '';
  return ICONS[key] ?? ICONS.default ?? 'ellipse-outline';
}

export function ProductRow({ product, onPress }: { product: ProductInput; onPress?: () => void }) {
  const monthly = monthlyCostCents(product.priceCents, product.servingsPerContainer, product.servingsPerDay);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.product, pressed ? { opacity: 0.85 } : null]}>
      <View style={styles.iconBubble}>
        <Ionicons name={productIcon(product)} size={18} color={theme.teal} />
      </View>
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
      <T weight="bold" size={16}>
        {formatUsd(monthly)}
      </T>
    </Pressable>
  );
}

export function Boot({ message }: { message: string }) {
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: theme.bg, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { letterSpacing: 0.8, textTransform: 'uppercase' },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    gap: 8,
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonTeal: { backgroundColor: theme.teal },
  buttonGhost: { backgroundColor: theme.card, borderWidth: 1, borderColor: '#D9DEE5' },
  disclaimer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#F8F9FB',
    padding: 14,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  product: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boot: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
});
