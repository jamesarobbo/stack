import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { typeStyle, useTheme, type TypeVariant } from '../theme';

/** Typed text from the theme ramp. Prefer `v` over one off font sizes. */
export function Text({
  v = 'body',
  children,
  color,
  style,
  numberOfLines,
  scale = true,
}: {
  v?: TypeVariant;
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  scale?: boolean;
}) {
  const theme = useTheme();
  const base = typeStyle(v, theme);
  return (
    <RNText
      allowFontScaling={scale}
      numberOfLines={numberOfLines}
      style={[base, color ? { color } : null, style]}
    >
      {children}
    </RNText>
  );
}
