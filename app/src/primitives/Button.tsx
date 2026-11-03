import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { control, font, fontFamily, radius, space, typeSize, useTheme } from '../theme';
import { Text } from './Text';

export type ButtonKind = 'primary' | 'secondary' | 'plain' | 'destructive';

/**
 * Fixed CTA set modelled on Spanish Out Loud.
 * One height, one radius, one type size/weight. Prefer at most one primary per screen.
 */
export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  loading?: boolean;
  /** Filled/bordered kinds default full width; plain hugs content unless set. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const stretch = kind === 'plain' ? fullWidth === true : fullWidth !== false;
  const box =
    kind === 'primary'
      ? { backgroundColor: theme.action }
      : kind === 'secondary'
        ? { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line }
        : kind === 'destructive'
          ? { backgroundColor: theme.flagBg, borderWidth: 1, borderColor: theme.flagText }
          : { backgroundColor: 'transparent' };
  const color =
    kind === 'primary'
      ? theme.onAction
      : kind === 'destructive'
        ? theme.flagText
        : kind === 'plain'
          ? theme.action
          : theme.text;
  const height = kind === 'plain' ? control.height : control.button;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          minHeight: height,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: kind === 'plain' ? space.sm : space.xl,
          alignSelf: stretch ? 'stretch' : 'center',
          width: stretch ? '100%' : undefined,
          opacity: disabled || loading ? 0.45 : pressed ? 0.88 : 1,
        },
        box,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text
          v="subheading"
          color={color}
          style={{ fontFamily, fontWeight: font.semibold, fontSize: typeSize.body, lineHeight: 22 }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
