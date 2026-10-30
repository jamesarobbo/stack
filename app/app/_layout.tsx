import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Boot } from '@/src/components/ui';
import { openStackDatabase, migrations, type AppDatabase } from '@/src/db/client';
import { AppProvider, useApp } from '@/src/state';
import { theme } from '@/src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#E7E9EE' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: theme.bg }}>
          <StatusBar style="dark" />
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
  const app = useApp();
  if (app.bootError) return <Boot message={app.bootError} />;
  if (!app.ready) return <Boot message="Loading your stack…" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
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
    </Stack>
  );
}
