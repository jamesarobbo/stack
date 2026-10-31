import RNSegmentedControl from '@react-native-segmented-control/segmented-control';
import type { ComponentType } from 'react';
import { Platform, Pressable, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

type ChangeEvent = NativeSyntheticEvent<{ selectedSegmentIndex: number }>;

type SegmentedProps = {
  values: string[];
  selectedIndex: number;
  onChange: (event: ChangeEvent) => void;
  tintColor?: string;
  backgroundColor?: string;
  fontStyle?: { color?: string; fontWeight?: string };
  activeFontStyle?: { color?: string; fontWeight?: string };
  appearance?: 'light' | 'dark';
  style?: object;
};

// Package types target older React; cast for React 19 JSX.
const SegmentedControl = RNSegmentedControl as unknown as ComponentType<SegmentedProps>;

/**
 * Short exclusive choice set.
 * Uses the system segmented control on iOS and Android (Expo Go).
 * No outer grey container — only the native control's own track.
 * Web keeps a simple row of buttons with the same API.
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
  const dark = theme.bg === '#000000';

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

  return (
    <SegmentedControl
      values={items.map((item) => item.label)}
      selectedIndex={index}
      onChange={(event) => {
        const next = items[event.nativeEvent.selectedSegmentIndex];
        if (next) onChange(next.key);
      }}
      tintColor={theme.segmentOn}
      backgroundColor={theme.segmentTrack}
      fontStyle={{ color: theme.muted, fontWeight: '500' }}
      activeFontStyle={{ color: dark ? '#FFFFFF' : theme.text, fontWeight: '600' }}
      appearance={dark ? 'dark' : 'light'}
      style={styles.control}
    />
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    // No outer wrapper. Stretch only — track color comes from backgroundColor prop.
    control: {
      alignSelf: 'stretch',
    },
    web: {
      flexDirection: 'row',
      backgroundColor: theme.segmentTrack,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    webItem: { flex: 1, minHeight: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
    webItemOn: { backgroundColor: theme.segmentOn },
  });
}
