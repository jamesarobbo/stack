import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { space, useTheme } from '../theme';
import { ScanFrame } from './ScanFrame';
import { Button, T } from './ui';

export function ScanCamera({ torch, onScan }: { torch: boolean; onScan: (code: string) => void }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission || !permission.granted) {
    return (
      <View style={{ gap: space.md }}>
        <ScanFrame />
        <T size={14} color={theme.muted}>
          Stack needs the camera to read a barcode. Photos are not saved.
        </T>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
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
