import type { ConfigContext, ExpoConfig } from 'expo/config';
import { ANDROID_PACKAGE, APP_NAME, APP_SCHEME, APP_SLUG, IOS_BUNDLE_ID } from './brand.cjs';

const healthUsage =
  `${APP_NAME} reads sleep, heart rate variability, resting heart rate, VO2 max, steps, and active energy to show associations with supplements you log. Educational only, not medical advice.`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: APP_SCHEME,
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE_ID,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSHealthShareUsageDescription: healthUsage,
      NSHealthUpdateUsageDescription: `${APP_NAME} does not write health data.`,
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      backgroundColor: '#F4F5F7',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    ],
    'expo-sqlite',
    'expo-sharing',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#F4F5F7',
      },
    ],
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription: healthUsage,
        NSHealthUpdateUsageDescription: false,
        background: false,
      },
    ],
    ...(process.env.EXPO_PUBLIC_SENTRY_DSN ? ['@sentry/react-native' as const] : []),
    'expo-apple-authentication',
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    appName: APP_NAME,
  },
});
