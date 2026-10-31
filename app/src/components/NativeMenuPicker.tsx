import type { ReactNode } from 'react';
import { Host, Picker, Text, VStack } from '@expo/ui/swift-ui';
import { accessibilityLabel as a11yLabel, frame, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { control, radius, space, useTheme } from '../theme';

/**
 * Native iOS pull-down menu picker (UIMenu / SwiftUI menu Picker).
 * Fixed height Host so the label centres with the amount field beside it.
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

  const modifiers = [
    pickerStyle('menu'),
    labelsHidden(),
    frame({ height: control.height, alignment: 'center' }),
  ];
  if (accessibilityLabel) modifiers.push(a11yLabel(accessibilityLabel));

  return (
    <Host
      matchContents={false}
      colorScheme={theme.bg === '#000000' ? 'dark' : 'light'}
      style={[styles.host, style]}
    >
      <VStack
        alignment="center"
        spacing={0}
        modifiers={[frame({ maxWidth: 9999, minHeight: control.height, maxHeight: control.height, alignment: 'center' })]}
      >
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
      </VStack>
    </Host>
  );
}

/** Compact chrome around NativeMenuPicker for amount+unit rows. Fills parent width and height. */
export function CompactMenuPickerShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: theme.greyPill,
          height: control.height,
          minHeight: control.height,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignSelf: 'stretch',
    height: control.height,
    minHeight: control.height,
    width: '100%',
    justifyContent: 'center',
  },
  shell: {
    flex: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
