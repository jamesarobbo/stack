// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: [
      'src/health/connect.ios.ts',
      'src/purchases.ts',
      'src/settings/settingsStore.ts',
      'src/telemetry.ts',
    ],
    rules: {
      // Native modules are loaded only outside Expo Go. A static import would crash that client.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
