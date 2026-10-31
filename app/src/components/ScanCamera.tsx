import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space, useTheme, useThemedStyles, type Theme } from '../theme';
import { ScanFrame } from './ScanFrame';
import { T } from './ui';

export function ScanCamera({ torch, onScan }: { torch: boolean; onScan: (code: string) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission || !permission.granted) {
    return (
      <View style={{ gap: space.md }}>
        <ScanFrame />
        <T size={14} color={theme.muted}>
          Stack needs the camera to read a barcode. Photos are not saved.
        </T>
        <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.allow}>
          <T weight="semibold" color="#fff">
            Allow camera
          </T>
        </Pressable>
        {permission && !permission.canAskAgain ? (
          <T size={13} color={theme.muted}>
            Camera access is off. Allow it in Settings, or type the barcode below.
          </T>
        ) : null}
      </View>
    );
  }

  return (
    <ScanFrame>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'ean13'] }}
        onBarcodeScanned={
          locked
            ? undefined
            : (result) => {
                setLocked(true);
                onScan(result.data);
              }
        }
      />
    </ScanFrame>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  allow: {
    backgroundColor: theme.teal,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
}

