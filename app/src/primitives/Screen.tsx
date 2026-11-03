import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../theme';

/** App screen shell: safe top inset, horizontal page padding, optional footer. */
export function Screen({
  children,
  footer,
  scroll = true,
  style,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pad = {
    paddingHorizontal: space.xl,
    paddingTop: insets.top + space.lg,
    paddingBottom: space.xl,
    gap: space.xl,
  };
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[pad, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad, style]}>{children}</View>
  );
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: space.xl,
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.md),
            backgroundColor: theme.bg,
            gap: space.sm,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
