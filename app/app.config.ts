import type { ConfigContext, ExpoConfig } from 'expo/config';
import { ANDROID_PACKAGE, APP_NAME, APP_SCHEME, APP_SLUG, IOS_BUNDLE_ID } from './brand.cjs';

const healthUsage =
  `${APP_NAME} reads sleep, heart rate variability, resting heart rate, VO2 max, steps, and active energy to show associations with supplements you log and to work out before and after results on this iPhone. It also reads date of birth and biological sex to suggest an age range and sex. Health data stays on this iPhone and is never used for advertising or analytics. Educational only, not medical advice.`;

/** Universal links for shared stacks. Served by the Worker at /.well-known/apple-app-site-association. */
function linkHost(): string | null {
  const raw = process.env.EXPO_PUBLIC_SHARE_HOST || process.env.EXPO_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
    return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
  } catch {
    return null;
  }
}
const sharedLinkHost = linkHost();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  owner: 'jamesarobbo',
  version: '0.1.0',
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  updates: {
    url: 'https://u.expo.dev/8e8c7f9d-29a6-4db2-9509-58ad926604ca',
  },
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: APP_SCHEME,
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F6F3EC',
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE_ID,
    usesAppleSignIn: true,
    ...(sharedLinkHost ? { associatedDomains: [`applinks:${sharedLinkHost}`] } : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSHealthShareUsageDescription: healthUsage,
      NSHealthUpdateUsageDescription: `${APP_NAME} does not write health data.`,
      NSCameraUsageDescription: `${APP_NAME} uses the camera to read a supplement barcode. It does not save photos.`,
      EXDevMenuShowFloatingActionButton: false,
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      backgroundColor: '#F6F3EC',
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
        backgroundColor: '#F6F3EC',
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
    '@react-native-community/datetimepicker',
    [
      'expo-camera',
      {
        cameraPermission: `${APP_NAME} uses the camera to read a supplement barcode. It does not save photos.`,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        color: '#0066CC',
        enableRemoteNotifications: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    appName: APP_NAME,
    eas: {
      projectId: '8e8c7f9d-29a6-4db2-9509-58ad926604ca',
    },
  },
});
