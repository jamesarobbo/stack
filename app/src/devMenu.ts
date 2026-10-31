import { Platform } from 'react-native';

type DevMenuModule = {
  openMenu?: () => void;
  setToolsButtonVisible?: (visible: boolean) => void;
};

function devMenu(): DevMenuModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // Optional native module. A dynamic import lets the gear paint before the hide runs.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-dev-menu') as DevMenuModule;
  } catch {
    return null;
  }
}

/** Hide Expo's blue floating gear as soon as this module loads, and again when the app is active. Tools stay in More. */
export function hideFloatingDevTools() {
  try {
    devMenu()?.setToolsButtonVisible?.(false);
  } catch {
    /* The web stub throws. A release build may not include the menu. */
  }
}

hideFloatingDevTools();

export function openDevTools() {
  try {
    devMenu()?.openMenu?.();
  } catch {
    /* absent on web and some builds */
  }
}

export function devToolsInProfile() {
  return Platform.OS !== 'web' && typeof __DEV__ !== 'undefined' && __DEV__;
}
