import type { ReactNode, Ref } from 'react';
import { TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { control, font, fontFamily, radius, space, useTheme } from '../theme';
import { UnitField } from '../components/UnitField';
import type { UnitOption } from '../data/units';

/**
 * Amount + unit on one row, exactly 50/50 width, shared control height.
 * Used on add product, manual entry, and product detail.
 */
export function DoseRow({
  amount,
  onChangeAmount,
  unit,
  onChangeUnit,
  accessibilityLabel,
  inputAccessoryViewID,
  onFocus,
  onBlur,
  placeholder = '0',
  inputRef,
}: {
  amount: string;
  onChangeAmount: (value: string) => void;
  unit: string;
  onChangeUnit: (unit: UnitOption) => void;
  accessibilityLabel: string;
  inputAccessoryViewID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  inputRef?: Ref<any>;
}) {
  const theme = useTheme();
  const field: StyleProp<TextStyle> = {
    flex: 1,
    height: control.height,
    minHeight: control.height,
    backgroundColor: theme.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: space.md,
    fontSize: 16,
    fontFamily,
    fontWeight: font.semibold,
    color: theme.text,
    textAlignVertical: 'center',
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        value={amount}
        onChangeText={onChangeAmount}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        clearButtonMode="while-editing"
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        inputAccessoryViewID={inputAccessoryViewID}
        style={field}
      />
      <View style={{ flex: 1, height: control.height }}>
        <UnitField compact value={unit} onChange={onChangeUnit} />
      </View>
    </View>
  );
}

/** Wrap any trailing control so it shares the dose row flex slot. */
export function DoseSlot({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, height: control.height, justifyContent: 'center' }}>{children}</View>;
}
