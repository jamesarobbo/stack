import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { compactCount, copiesLabel, viewsLabel } from '../../../shared/engagement';
import { useTheme } from '../theme';
import { T } from './ui';


/** Copy and view counts as icon stats. Null counts are hidden (under 3 copies, under 10 views). */
export function EngagementStats({ copies, views }: { copies: number | null; views: number | null }) {
  if (copies == null && views == null) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
      {copies != null ? <Stat icon="copy-outline" value={compactCount(copies)} label={copiesLabel(copies)} /> : null}
      {views != null ? <Stat icon="eye-outline" value={compactCount(views)} label={viewsLabel(views)} /> : null}
    </View>
  );
}

function Stat({ icon, value, label }: { icon: 'copy-outline' | 'eye-outline'; value: string; label: string }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={16} color={theme.muted} />
      <T size={13} weight="semibold" color={theme.muted}>
        {value}
      </T>
    </View>
  );
}

/** Phrases for a parent control that replaces its children's accessibility labels. */
export function engagementPhrase(copies: number | null, views: number | null): string {
  return [copies != null ? copiesLabel(copies) : null, views != null ? viewsLabel(views) : null].filter((part): part is string => part != null).join(', ');
}
