import { router, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Boot } from '@/src/components/ui';
import { claimDeferredLink, takePendingSlug } from '@/src/data/sharing';
import { getSetting } from '@/src/settings';
import { hideFloatingDevTools } from '@/src/devMenu';
import { redirectOnLaunch } from '@/src/navigation/exit';
import { openStackDatabase, migrations, type AppDatabase } from '@/src/db/client';
import { AppProvider, useApp } from '@/src/state';
import { useTheme } from '@/src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const theme = useTheme();
  const scheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: theme.bg }}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <DatabaseGate />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

function DatabaseGate() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    openStackDatabase()
      .then((opened) => {
        if (!cancelled) setDatabase(opened);
      })
      .catch((error: unknown) => {
        if (!cancelled) setOpenError(error instanceof Error ? error.message : 'Could not open on-device storage.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (openError) return <Boot message={openError} />;
  if (!database) return <Boot message="Preparing on-device storage…" />;
  return <Migrations database={database} />;
}

function Migrations({ database }: { database: AppDatabase }) {
  const { success, error } = useMigrations(database, migrations);
  if (error) return <Boot message={error.message} />;
  if (!success) return <Boot message="Preparing on-device storage…" />;
  return (
    <AppProvider>
      <RootNav />
    </AppProvider>
  );
}

function RootNav() {
  const theme = useTheme();
  const app = useApp();
  const pathname = usePathname();
  const checkedLaunch = useRef(false);

  useEffect(() => {
    hideFloatingDevTools();
  }, []);

  useEffect(() => {
    if (!app.ready || checkedLaunch.current) return;
    checkedLaunch.current = true;
    const next = redirectOnLaunch(pathname, app.onboardingComplete);
    if (next) router.replace(next);
  }, [app.onboardingComplete, app.ready, pathname]);

  const launched = useRef(false);
  useEffect(() => {
    if (!app.ready || launched.current) return;
    launched.current = true;
    if (Platform.OS !== 'web') void claimDeferredLink();
    void app.backgroundRefresh();
  }, [app]);

  // A stack link that installed the app opens once onboarding is done.
  useEffect(() => {
    if (!app.ready || !app.onboardingComplete || !getSetting('pendingSlug')) return;
    void takePendingSlug().then((slug) => {
      if (slug) router.push(`/s/${slug}`);
    });
  }, [app.onboardingComplete, app.ready, pathname]);

  if (app.bootError) return <Boot message={app.bootError} />;
  if (!app.ready) return <Boot message="Loading your stack…" />;
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="report" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="share" />
      <Stack.Screen name="s/[slug]" />
    </Stack>
  );
}
