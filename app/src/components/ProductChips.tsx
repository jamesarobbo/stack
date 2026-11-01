import { View } from 'react-native';
import { chipTone, shortProductName } from '../../../shared/goalSuggestions';
import { radius, space, useTheme } from '../theme';
import { T } from './ui';

const SHOWN = 4;

/** Up to four short product names, then a count of the rest. Two lines at most. */
export function ProductChips({ names }: { names: string[] }) {
  const theme = useTheme();
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  const shown = clean.slice(0, SHOWN);
  const extra = clean.length - shown.length;
  const labels = extra > 0 ? [...shown.map(shortProductName), `+${extra} more`] : shown.map(shortProductName);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, maxHeight: 62, overflow: 'hidden' }}>
      {labels.map((label, index) => {
        const more = index >= shown.length;
        const tone = more ? 'neutral' : chipTone(clean[index] ?? label);
        const colors = theme.chips[tone];
        return (
          <View key={`${label}-${index}`} style={{ backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 }}>
            <T size={12} weight="semibold" color={colors.fg}>
              {label}
            </T>
          </View>
        );
      })}
    </View>
  );
}
