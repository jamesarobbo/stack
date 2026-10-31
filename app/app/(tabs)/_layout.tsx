import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { DISCOVER_LABEL } from '@/src/copy/library';
import { font, useTheme } from '@/src/theme';

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.teal,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.line,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontWeight: font.medium, fontSize: 11, lineHeight: 14 },
      }}
    >
      <Tabs.Screen
        name="stack"
        options={{
          title: 'Stack',
          tabBarIcon: ({ color }) => <Ionicons name="layers-outline" color={typeof color === 'string' ? color : theme.muted} size={22} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: DISCOVER_LABEL,
          tabBarIcon: ({ color }) => <Ionicons name="compass-outline" color={typeof color === 'string' ? color : theme.muted} size={22} />,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" color={typeof color === 'string' ? color : theme.muted} size={22} />,
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          title: 'Impact',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" color={typeof color === 'string' ? color : theme.muted} size={22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Ionicons name="ellipsis-horizontal" color={typeof color === 'string' ? color : theme.muted} size={22} />,
        }}
      />
    </Tabs>
  );
}
