import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles, type Theme, space } from '../theme';
import { ScanFrame } from './ScanFrame';
import { T } from './ui';

/** Web has no reliable barcode camera here. The phone build uses expo-camera. */
export function ScanCamera({ torch }: { torch: boolean; onScan: (code: string) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <ScanFrame>
      <View style={styles.placeholder}>
        <T size={14} color={theme.muted} style={{ textAlign: 'center' }}>
          {torch
            ? 'Torch is on for the phone camera. Type the barcode below on the web.'
            : 'The camera runs in Expo Go on a phone. Type the barcode below to look it up.'}
        </T>
      </View>
    </ScanFrame>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
});
}

