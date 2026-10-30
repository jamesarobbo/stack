import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { T } from '@/src/components/ui';
import { theme } from '@/src/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <View style={styles.container}>
        <T weight="bold" size={22}>
          That screen is not in the app.
        </T>
        <Link href="/" style={styles.link}>
          <T weight="semibold" color={theme.teal}>
            Go back
          </T>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.bg, gap: 12 },
  link: { paddingVertical: 8 },
});
