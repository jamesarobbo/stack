import { useMemo } from 'react';
import { Appearance, Platform, useColorScheme, type ColorSchemeName, type TextStyle } from 'react-native';

/**
 * Stack theme, structured like Spanish Out Loud: one spacing scale, radii,
 * type ramp, and shared control heights. Colours stay Stack (#0066CC action,
 * gold for money only). Light and dark are both AA.
 */
export type ChipColors = { bg: string; fg: string };

export type Theme = {
  bg: string;
  card: string;
  sand: string;
  text: string;
  muted: string;
  /** Same contrast as muted. Placeholders and quiet icons, never a failing gray. */
  faint: string;
  line: string;
  lineStrong: string;
  teal: string;
  tealDark: string;
  tealSoft: string;
  tealText: string;
  action: string;
  onAction: string;
  amber: string;
  amberBg: string;
  amberBorder: string;
  amberPill: string;
  blue: string;
  flagBg: string;
  flagText: string;
  greyPill: string;
  shadow: string;
  /** @deprecated Prefer radius.md. Kept for older call sites. */
  radius: number;
  /** @deprecated Prefer radius.sm. */
  radiusSm: number;
  sleep: string;
  hrv: string;
  heart: string;
  near: string;
  good: string;
  goodFill: string;
  score: string;
  scoreTrack: string;
  neutralFill: string;
  segmentTrack: string;
  segmentOn: string;
  mark: string;
  chips: {
    sleep: ChipColors;
    heart: ChipColors;
    recovery: ChipColors;
    focus: ChipColors;
    energy: ChipColors;
    neutral: ChipColors;
  };
};

export const lightTheme: Theme = {
  bg: '#F6F3EC',
  card: '#FFFFFF',
  sand: '#ECE8DF',
  text: '#0B1D3A',
  muted: '#4F5B72',
  faint: '#8790A3',
  line: '#DFDBD1',
  lineStrong: '#C9C4B8',
  teal: '#0066CC',
  tealDark: '#004F9E',
  tealSoft: '#E8F1FB',
  tealText: '#0066CC',
  action: '#0066CC',
  onAction: '#FFFFFF',
  amber: '#8A5600',
  amberBg: '#FFF4D4',
  amberBorder: '#E4C98A',
  amberPill: '#FFF4D4',
  blue: '#0066CC',
  flagBg: '#FCE6E3',
  flagText: '#B42318',
  greyPill: '#ECE8DF',
  shadow: 'rgba(11, 29, 58, 0.06)',
  radius: 14,
  radiusSm: 10,
  sleep: '#5856D6',
  hrv: '#0A7A8C',
  heart: '#D70040',
  near: '#D70040',
  good: '#1F7A34',
  goodFill: '#1F7A34',
  score: '#0B1D3A',
  scoreTrack: '#ECE8DF',
  neutralFill: '#0B1D3A',
  segmentTrack: '#ECE8DF',
  segmentOn: '#FFFFFF',
  mark: '#0E7A45',
  chips: {
    sleep: { bg: '#ECE8DF', fg: '#4F5B72' },
    heart: { bg: '#ECE8DF', fg: '#4F5B72' },
    recovery: { bg: '#ECE8DF', fg: '#4F5B72' },
    focus: { bg: '#ECE8DF', fg: '#4F5B72' },
    energy: { bg: '#ECE8DF', fg: '#4F5B72' },
    neutral: { bg: '#ECE8DF', fg: '#4F5B72' },
  },
};

export const darkTheme: Theme = {
  bg: '#16130F',
  card: '#241F1A',
  sand: '#2E2822',
  text: '#F6F3EC',
  muted: '#A89F90',
  faint: '#8A8276',
  line: '#3A342C',
  lineStrong: '#4A433A',
  teal: '#64B5FF',
  tealDark: '#64B5FF',
  tealSoft: '#1C2C3A',
  tealText: '#64B5FF',
  action: '#0066CC',
  onAction: '#FFFFFF',
  amber: '#F5C14A',
  amberBg: '#2A2414',
  amberBorder: '#3A3320',
  amberPill: '#2A2414',
  blue: '#64B5FF',
  flagBg: '#3A1518',
  flagText: '#FF6961',
  greyPill: '#2E2822',
  shadow: 'rgba(0, 0, 0, 0.4)',
  radius: 14,
  radiusSm: 10,
  sleep: '#A29BFE',
  hrv: '#5AC8FA',
  heart: '#FF375F',
  near: '#FF375F',
  good: '#30D158',
  goodFill: '#1F7A34',
  score: '#F6F3EC',
  scoreTrack: '#3A342C',
  neutralFill: '#3A342C',
  segmentTrack: '#2E2822',
  segmentOn: '#3A342C',
  mark: '#0E7A45',
  chips: {
    sleep: { bg: '#2E2822', fg: '#A89F90' },
    heart: { bg: '#2E2822', fg: '#A89F90' },
    recovery: { bg: '#2E2822', fg: '#A89F90' },
    focus: { bg: '#2E2822', fg: '#A89F90' },
    energy: { bg: '#2E2822', fg: '#A89F90' },
    neutral: { bg: '#2E2822', fg: '#A89F90' },
  },
};

/** SOL scale: xs4 sm8 md12 lg16 xl24 xxl32 xxxl48. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** SOL radii. theme.radius / radiusSm mirror md / sm for older call sites. */
export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Shared control heights so amount, unit, and text fields line up. */
export const control = {
  height: 44,
  compact: 36,
  button: 54,
  buttonMd: 46,
  buttonSm: 36,
  listRow: 56,
  backHeader: 48,
} as const;

/**
 * SF Pro Rounded on iOS via the system UI rounded face. No custom font file;
 * Expo Go picks it up. Android and web keep the platform UI font.
 */
export const fontFamily = Platform.OS === 'ios' ? 'ui-rounded' : undefined;

/** Two weights only. medium and bold are aliases kept for older call sites. */
export const font = {
  regular: '400' as const,
  semibold: '600' as const,
  /** Alias of regular. Prefer regular. */
  medium: '400' as const,
  /** Alias of semibold. Prefer semibold. */
  bold: '600' as const,
};


export type TypeVariant = 'hero' | 'title' | 'heading' | 'subheading' | 'body' | 'bodySmall' | 'label' | 'caption' | 'money';

/** Font sizes from the type ramp (no colour). */
export const typeSize = {
  hero: 34,
  title: 28,
  heading: 20,
  subheading: 16,
  body: 16,
  bodySmall: 14,
  label: 13,
  caption: 12,
  money: 34,
  tab: 11,
} as const;

/** Shared text face + weight for TextInput and native-ish fields. */
export function fieldTextStyle(theme: Theme): TextStyle {
  return {
    fontFamily,
    fontWeight: font.regular,
    fontSize: typeSize.body,
    color: theme.text,
  };
}

/** Type ramp: size and tone carry hierarchy; only regular and semibold. */
export function typeStyle(variant: TypeVariant, theme: Theme): TextStyle {
  const face = { fontFamily };
  switch (variant) {
    case 'hero':
      return { ...face, fontWeight: font.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: theme.text };
    case 'title':
      return { ...face, fontWeight: font.semibold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: theme.text };
    case 'heading':
      return { ...face, fontWeight: font.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: theme.text };
    case 'subheading':
      return { ...face, fontWeight: font.semibold, fontSize: 16, lineHeight: 22, color: theme.text };
    case 'body':
      return { ...face, fontWeight: font.regular, fontSize: 16, lineHeight: 24, color: theme.text };
    case 'bodySmall':
      return { ...face, fontWeight: font.regular, fontSize: 14, lineHeight: 20, color: theme.muted };
    case 'label':
      return { ...face, fontWeight: font.semibold, fontSize: 13, lineHeight: 18, color: theme.muted };
    case 'caption':
      return { ...face, fontWeight: font.regular, fontSize: 12, lineHeight: 16, color: theme.faint };
    case 'money':
      return { ...face, fontWeight: font.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: theme.amber };
    default:
      return { ...face, fontWeight: font.regular, fontSize: 16, lineHeight: 24, color: theme.text };
  }
}

/** Prefer the live hook; fall back to Appearance so null never forces light cream. */
export function resolvedColorScheme(scheme: ColorSchemeName | null | undefined): 'light' | 'dark' {
  if (scheme === 'light' || scheme === 'dark') return scheme;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  const scheme = resolvedColorScheme(useColorScheme());
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export function backgroundForScheme(scheme: ColorSchemeName | null | undefined): string {
  return resolvedColorScheme(scheme) === 'dark' ? darkTheme.bg : lightTheme.bg;
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
