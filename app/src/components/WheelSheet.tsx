import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { control, radius, space, useTheme } from '../theme';
import { T } from './ui';

/**
 * Compact iOS-style wheel sheet: dimmed backdrop, bottom card ~half screen max,
 * sized to header + wheel (~320pt). Tap backdrop to dismiss.
 */
export function WheelSheet({
  visible,
  title,
  onCancel,
  onDone,
  children,
}: {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxSheet = Math.min(Math.round(windowHeight * 0.5), 360);
  const sheetHeight = Math.min(maxSheet, 320 + Math.max(insets.bottom, 12));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onCancel}
          style={[styles.backdrop, { backgroundColor: theme.bg === '#16130F' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)' }]}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              maxHeight: maxSheet,
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[styles.bar, { borderBottomColor: theme.line }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} hitSlop={8} style={styles.action}>
              <T size={17} color={theme.action}>
                Cancel
              </T>
            </Pressable>
            <T weight="semibold" size={17} style={{ flex: 1, textAlign: 'center' }}>
              {title}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={onDone} hitSlop={8} style={styles.action}>
              <T size={17} weight="semibold" color={theme.action}>
                Done
              </T>
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bar: {
    minHeight: control.button,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: {
    minWidth: 72,
    minHeight: control.height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  body: { flex: 1, justifyContent: 'center' },
});
