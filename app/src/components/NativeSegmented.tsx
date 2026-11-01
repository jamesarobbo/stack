import RNSegmentedControl from '@react-native-segmented-control/segmented-control';
import type { ComponentType } from 'react';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { frame, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Platform, Pressable, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { control, radius, space, useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

type ChangeEvent = NativeSyntheticEvent<{ selectedSegmentIndex: number }>;

type SegmentedProps = {
  values: string[];
  selectedIndex: number;
  onChange: (event: ChangeEvent) => void;
  tintColor?: string;
  fontStyle?: { color?: string; fontWeight?: string };
  activeFontStyle?: { color?: string; fontWeight?: string };
  appearance?: 'light' | 'dark';
  style?: object;
};

// Package types target older React; cast for React 19 JSX.
const SegmentedControl = RNSegmentedControl as unknown as ComponentType<SegmentedProps>;

/**
 * Short exclusive choice set.
 * iOS: SwiftUI segmented Picker inside a transparent Host (no outer square fill).
 * Android: system segmented control with no wrapper background.
 * Web: simple row of buttons with the same API.
 */
export function NativeSegmented<K extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const index = Math.max(
    0,
    items.findIndex((item) => item.key === value),
  );
  const dark = theme.bg === '#16130F';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.web} accessibilityRole="tablist">
        {items.map((item) => {
          const on = item.key === value;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(item.key)}
              style={[styles.webItem, on ? styles.webItemOn : null]}
            >
              <T size={13} weight="semibold" color={on ? theme.text : theme.muted} style={{ textAlign: 'center' }}>
                {item.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <Host
        matchContents={false}
        colorScheme={dark ? 'dark' : 'light'}
        style={styles.host}
      >
        <Picker
          selection={value}
          onSelectionChange={(selection) => {
            if (selection == null) return;
            const next = String(selection) as K;
            if (items.some((item) => item.key === next)) onChange(next);
          }}
          modifiers={[
            pickerStyle('segmented'),
            labelsHidden(),
            frame({ maxWidth: 9999, alignment: 'center' }),
          ]}
        >
          {items.map((item) => (
            <Text key={item.key} modifiers={[tag(item.key)]}>
              {item.label}
            </Text>
          ))}
        </Picker>
      </Host>
    );
  }

  // Android: native control. Do not wrap in a coloured View.
  return (
    <SegmentedControl
      values={items.map((item) => item.label)}
      selectedIndex={index}
      onChange={(event) => {
        const next = items[event.nativeEvent.selectedSegmentIndex];
        if (next) onChange(next.key);
      }}
      tintColor={theme.segmentOn}
      fontStyle={{ color: theme.muted, fontWeight: '500' }}
      activeFontStyle={{ color: dark ? '#FFFFFF' : theme.text, fontWeight: '600' }}
      appearance={dark ? 'dark' : 'light'}
      style={styles.control}
    />
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    // Transparent host only - no backgroundColor, no padding box.
    host: {
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
      minHeight: 32,
    },
    control: {
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
    },
    web: {
      flexDirection: 'row',
      backgroundColor: theme.segmentTrack,
      borderRadius: radius.sm,
      padding: 3,
      gap: space.xxs,
    },
    webItem: {
      flex: 1,
      minHeight: control.compact,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space.sm,
    },
    webItemOn: { backgroundColor: theme.segmentOn },
  });
}
