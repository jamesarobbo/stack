import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { control, radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** Settings style list row. Fixed min height. */
export function Row({
  title,
  subtitle,
  value,
  onPress,
  right,
  danger,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        minHeight: control.listRow,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text v="subheading" color={danger ? theme.flagText : theme.text}>
          {title}
        </Text>
        {subtitle ? (
          <Text v="bodySmall" color={theme.muted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text v="body" color={theme.muted}>
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={theme.faint} /> : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { backgroundColor: theme.tealSoft } : null)}
    >
      {body}
    </Pressable>
  );
}

/** Grouped list card wrapping Rows. */
export function Group({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {title ? (
        <Text v="label" style={{ marginLeft: space.xs }}>
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.line,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
      {footer ? (
        <Text v="caption" style={{ marginHorizontal: space.xs }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
