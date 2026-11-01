import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, useTheme } from '../theme';

/** Flat card: surface on paper, hairline border, SOL lg radius and xl padding. */
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
  const bg = tone === 'sand' ? theme.sand : tone === 'accent' ? theme.sand : theme.card;
  const bordered = tone === 'surface';
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.line,
          padding: padded ? space.xl : 0,
          gap: space.lg,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
