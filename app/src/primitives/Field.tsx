import type { ReactNode } from 'react';
import { TextInput, View, type StyleProp, type TextStyle, type TextInputProps } from 'react-native';
import { control, font, radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** Labeled text field with the shared control height. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  returnKeyType = 'done',
  inputAccessoryViewID,
  onFocus,
  onBlur,
  accessibilityLabel,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: TextInputProps['returnKeyType'];
  inputAccessoryViewID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {label ? (
        <Text v="label" color={theme.text}>
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        clearButtonMode="while-editing"
        inputAccessoryViewID={inputAccessoryViewID}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[
          {
            minHeight: control.height,
            height: control.height,
            backgroundColor: theme.bg,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: theme.line,
            paddingHorizontal: space.md,
            fontSize: 16,
            fontWeight: font.regular,
            color: theme.text,
          },
          style,
        ]}
      />
    </View>
  );
}

/** Section label above a block of content. */
export function SectionHeader({ label, right }: { label: string; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: control.height }}>
      <Text v="label" color={theme.muted}>
        {label}
      </Text>
      {right}
    </View>
  );
}
