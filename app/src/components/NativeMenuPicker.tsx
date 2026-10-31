import type { ReactNode } from 'react';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel as a11yLabel, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

/**
 * Native iOS pull-down menu picker (UIMenu / SwiftUI menu Picker).
 * Shows a checkmark on the current value. Android and web callers should
 * keep their own dropdown or select; this component is iOS-only.
 */
export function NativeMenuPicker<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  if (Platform.OS !== 'ios') return null;

  const modifiers = [pickerStyle('menu'), labelsHidden()];
  if (accessibilityLabel) modifiers.push(a11yLabel(accessibilityLabel));

  return (
    <Host matchContents colorScheme={theme.bg === '#000000' ? 'dark' : 'light'} style={[styles.host, style]}>
      <Picker
        selection={value}
        onSelectionChange={(selection) => {
          if (selection == null) return;
          const next = String(selection) as T;
          if (options.includes(next)) onChange(next);
        }}
        modifiers={modifiers}
      >
        {options.map((option) => (
          <Text key={option} modifiers={[tag(option)]}>
            {option}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

/** Compact chrome around NativeMenuPicker for amount+unit rows. */
export function CompactMenuPickerShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.shell, { backgroundColor: theme.greyPill }]}>{children}</View>;
}

const styles = StyleSheet.create({
  host: {
    minHeight: 44,
    justifyContent: 'center',
  },
  shell: {
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
