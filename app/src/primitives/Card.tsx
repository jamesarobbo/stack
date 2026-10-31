import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, useTheme } from '../theme';

/** Flat card: surface fill, hairline border, lg radius, lg padding. */
export function Card({
  children,
  style,
  tone = 'surface',
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'sand' | 'accent';
  padded?: boolean;
}) {
  const theme = useTheme();
  const bg = tone === 'sand' ? theme.sand : tone === 'accent' ? theme.tealSoft : theme.card;
  const border = tone === 'sand' ? 'transparent' : tone === 'accent' ? theme.tealSoft : theme.line;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderWidth: tone === 'sand' ? 0 : 1,
          borderColor: border,
          padding: padded ? space.lg : 0,
          gap: space.md,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
