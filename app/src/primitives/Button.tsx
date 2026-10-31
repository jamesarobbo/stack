import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { control, font, radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** Primary / secondary / ghost button with fixed SOL heights. */
export function Button({
  label,
  onPress,
  kind = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const height = size === 'sm' ? control.buttonSm : size === 'md' ? control.buttonMd : control.button;
  const box =
    kind === 'primary'
      ? { backgroundColor: theme.action }
      : kind === 'secondary'
        ? { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line }
        : kind === 'danger'
          ? { backgroundColor: theme.flagBg }
          : { backgroundColor: 'transparent' };
  const color =
    kind === 'primary' ? theme.onAction : kind === 'danger' ? theme.flagText : kind === 'ghost' ? theme.teal : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.xl,
          opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
        },
        box,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text v="subheading" color={color} style={{ fontWeight: font.bold }}>{label}</Text>}
    </Pressable>
  );
}
