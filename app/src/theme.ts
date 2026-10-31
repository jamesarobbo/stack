import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Apple minimal, light and dark. The phone's appearance picks the set.
 * `teal` is the link and icon accent. Filled buttons use `action` in both modes,
 * because the dark link blue is too light to hold white text.
 * Gold is money only. A score under 80 uses `score`, never green.
 */
export type ChipColors = { bg: string; fg: string };

export type Theme = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  /** Same contrast as muted. Placeholders and quiet icons, never a failing gray. */
  faint: string;
  line: string;
  teal: string;
  tealDark: string;
  tealSoft: string;
  tealText: string;
  action: string;
  amber: string;
  amberBg: string;
  amberBorder: string;
  amberPill: string;
  blue: string;
  flagBg: string;
  flagText: string;
  greyPill: string;
  shadow: string;
  radius: number;
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
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#1C1C1E',
  muted: '#636366',
  faint: '#636366',
  line: '#C6C6C8',
  teal: '#0066CC',
  tealDark: '#004F9E',
  tealSoft: '#E8F1FB',
  tealText: '#0066CC',
  action: '#0066CC',
  amber: '#8A5600',
  amberBg: '#FFF4D4',
  amberBorder: '#E4C98A',
  amberPill: '#FFF4D4',
  blue: '#0066CC',
  flagBg: '#FDECEC',
  flagText: '#B42318',
  greyPill: '#E5E5EA',
  shadow: 'rgba(0, 0, 0, 0.06)',
  radius: 12,
  radiusSm: 10,
  sleep: '#5856D6',
  hrv: '#0A7A8C',
  heart: '#D70040',
  near: '#D70040',
  good: '#1F7A34',
  goodFill: '#1F7A34',
  score: '#3A3A3C',
  scoreTrack: '#E5E5EA',
  neutralFill: '#3A3A3C',
  segmentTrack: '#E5E5EA',
  segmentOn: '#FFFFFF',
  mark: '#0E7A45',
  chips: {
    sleep: { bg: '#EEEDFE', fg: '#5856D6' },
    heart: { bg: '#FFF0F3', fg: '#D70040' },
    recovery: { bg: '#E7F6EB', fg: '#1F7A34' },
    focus: { bg: '#E8F1FB', fg: '#0066CC' },
    energy: { bg: '#E6F6F8', fg: '#0A7A8C' },
    neutral: { bg: '#E5E5EA', fg: '#636366' },
  },
};

export const darkTheme: Theme = {
  bg: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  muted: '#AEAEB2',
  faint: '#AEAEB2',
  line: '#38383A',
  teal: '#64B5FF',
  tealDark: '#64B5FF',
  tealSoft: '#1C2C3A',
  tealText: '#64B5FF',
  action: '#0066CC',
  amber: '#F5C14A',
  amberBg: '#1C1C1E',
  amberBorder: '#3A3320',
  amberPill: '#2A2414',
  blue: '#64B5FF',
  flagBg: '#3A1518',
  flagText: '#FF6961',
  greyPill: '#2C2C2E',
  shadow: 'rgba(0, 0, 0, 0.4)',
  radius: 12,
  radiusSm: 10,
  sleep: '#A29BFE',
  hrv: '#5AC8FA',
  heart: '#FF375F',
  near: '#FF375F',
  good: '#30D158',
  goodFill: '#1F7A34',
  score: '#EBEBF5',
  scoreTrack: '#3A3A3C',
  neutralFill: '#3A3A3C',
  segmentTrack: '#2C2C2E',
  segmentOn: '#3A3A3C',
  mark: '#0E7A45',
  chips: {
    sleep: { bg: '#2A2848', fg: '#A29BFE' },
    heart: { bg: '#3A1520', fg: '#FF375F' },
    recovery: { bg: '#12301C', fg: '#30D158' },
    focus: { bg: '#1C2C3A', fg: '#64B5FF' },
    energy: { bg: '#12323C', fg: '#5AC8FA' },
    neutral: { bg: '#2C2C2E', fg: '#AEAEB2' },
  },
};

/** Shared gaps and padding. Prefer these over one off numbers. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

/** System text. Weights only, so iOS uses SF and Android uses its own UI face. */
export const font = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
