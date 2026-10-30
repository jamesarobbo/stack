import { Platform } from 'react-native';

type DevMenuModule = {
  openMenu?: () => void;
  setToolsButtonVisible?: (visible: boolean) => void;
};

async function load(): Promise<DevMenuModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return (await import('expo-dev-menu')) as DevMenuModule;
  } catch {
    return null;
  }
}

/** Hide Expo's blue floating gear. It sits on top of headers. Tools stay in More. */
export function hideFloatingDevTools() {
  void load()
    .then((menu) => menu?.setToolsButtonVisible?.(false))
    .catch(() => undefined);
}

export function openDevTools() {
  void load()
    .then((menu) => menu?.openMenu?.())
    .catch(() => undefined);
}

export function devToolsInProfile() {
  return Platform.OS !== 'web' && typeof __DEV__ !== 'undefined' && __DEV__;
}
