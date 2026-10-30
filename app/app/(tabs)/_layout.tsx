import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { font, theme } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.teal,
        tabBarInactiveTintColor: theme.faint,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: theme.line,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="stack"
        options={{
          title: 'Stack',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" color={typeof color === 'string' ? color : theme.faint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={typeof color === 'string' ? color : theme.faint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          title: 'Impact',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={typeof color === 'string' ? color : theme.faint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" color={typeof color === 'string' ? color : theme.faint} size={size} />,
        }}
      />
    </Tabs>
  );
}
