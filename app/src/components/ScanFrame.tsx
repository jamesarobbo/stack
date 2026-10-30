import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

/** Corner brackets for the barcode preview. The camera, when present, sits behind them. */
export function ScanFrame({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.frame}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
    </View>
  );
}

const corner = {
  position: 'absolute' as const,
  width: 28,
  height: 28,
  borderColor: theme.teal,
};

const styles = StyleSheet.create({
  frame: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E7E9EE',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  corner,
  tl: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
});
