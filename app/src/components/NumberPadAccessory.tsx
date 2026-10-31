import { useEffect, useRef, useState, type ElementRef, type RefObject } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { control, space, useTheme, useThemedStyles, type Theme } from '../theme';
import { T } from './ui';

/** Shared nativeID for number and decimal pads. Replaces RN's lone Done pill. */
export const NUMBER_PAD_ACCESSORY_ID = 'stack-number-pad';

type TextInputRef = ElementRef<typeof TextInput>;
type PadField = { id: string; focus: () => void };

const padFields: PadField[] = [];
let activePadId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Full-width keyboard toolbar for number pads: Previous, Next, Done.
 * Mount once near the app root. Fields opt in with useNumberPadField.
 */
export function NumberPadAccessory() {
  if (Platform.OS !== 'ios') return null;
  return <NumberPadAccessoryBar />;
}

function NumberPadAccessoryBar() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const [, bump] = useState(0);

  useEffect(() => {
    const listener = () => bump((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const index = padFields.findIndex((field) => field.id === activePadId);
  const prev = index > 0 ? padFields[index - 1] : null;
  const next = index >= 0 && index < padFields.length - 1 ? padFields[index + 1] : null;
  const dark = theme.bg === '#000000';

  return (
    <InputAccessoryView nativeID={NUMBER_PAD_ACCESSORY_ID} backgroundColor={dark ? '#2C2C2E' : '#F2F2F7'}>
      <View style={[styles.bar, { borderTopColor: theme.line, backgroundColor: dark ? '#2C2C2E' : '#F2F2F7' }]}>
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous field"
            disabled={!prev}
            onPress={() => prev?.focus()}
            hitSlop={8}
            style={({ pressed }) => [styles.navBtn, pressed && prev ? { opacity: 0.7 } : null, !prev ? styles.navDisabled : null]}
          >
            <T size={16} weight="semibold" color={prev ? theme.teal : theme.faint}>
              Previous
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next field"
            disabled={!next}
            onPress={() => next?.focus()}
            hitSlop={8}
            style={({ pressed }) => [styles.navBtn, pressed && next ? { opacity: 0.7 } : null, !next ? styles.navDisabled : null]}
          >
            <T size={16} weight="semibold" color={next ? theme.teal : theme.faint}>
              Next
            </T>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          style={({ pressed }) => [styles.done, pressed ? { opacity: 0.7 } : null]}
        >
          <T size={16} weight="semibold" color={theme.teal}>
            Done
          </T>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

type PadProps = {
  inputAccessoryViewID: string | undefined;
  onFocus: () => void;
  onBlur: () => void;
};

/**
 * Registers a number-pad TextInput for the shared accessory (prev/next + Done).
 * Use: const [ref, pad] = useNumberPadField(id); then <TextInput ref={ref} {...pad} />.
 */
export function useNumberPadField(id: string, enabled = true): [RefObject<TextInputRef | null>, PadProps] {
  const ref = useRef<TextInputRef | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const entry: PadField = {
      id,
      focus: () => {
        ref.current?.focus();
      },
    };
    padFields.push(entry);
    return () => {
      const at = padFields.indexOf(entry);
      if (at >= 0) padFields.splice(at, 1);
      if (activePadId === id) {
        activePadId = null;
        notify();
      }
    };
  }, [id, enabled]);

  const props: PadProps = {
    inputAccessoryViewID: enabled && Platform.OS === 'ios' ? NUMBER_PAD_ACCESSORY_ID : undefined,
    onFocus: () => {
      if (!enabled) return;
      activePadId = id;
      notify();
    },
    onBlur: () => {
      if (!enabled) return;
      if (activePadId === id) {
        activePadId = null;
        notify();
      }
    },
  };

  return [ref, props];
}

function localStyles(_theme: Theme) {
  return StyleSheet.create({
    bar: {
      minHeight: control.height,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      width: '100%',
    },
    nav: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
    navBtn: { minHeight: control.height, justifyContent: 'center' },
    navDisabled: { opacity: 0.45 },
    done: { minHeight: control.height, justifyContent: 'center', paddingHorizontal: 4 },
  });
}
