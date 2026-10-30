import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

type BottleProps = {
  width?: number;
  height?: number;
  body: string;
  stroke: string;
  cap: string;
};

/** One bottle. The cap and body are fills. Do not put a label on the clay fill. */
export function Bottle({ width = 28, height = 52, body, stroke, cap }: BottleProps) {
  const capWidth = Math.round(width * 0.62);
  const capHeight = Math.max(10, Math.round(height * 0.22));
  return (
    <View style={{ width, alignItems: 'center' }}>
      <View style={{ width: capWidth, height: capHeight, borderRadius: 6, backgroundColor: cap, marginBottom: -2 }} />
      <View
        style={{
          width,
          height,
          borderRadius: Math.round(width * 0.36),
          backgroundColor: body,
          borderWidth: 3,
          borderColor: stroke,
        }}
      />
    </View>
  );
}

const SAGE = { body: '#D5EBE1', stroke: theme.teal, cap: theme.teal };
const CLAY = { body: '#F4C7B0', stroke: theme.clay, cap: theme.clay };
const CREAM = { body: '#FFF7EE', stroke: theme.amber, cap: theme.amber };
const WARM = { body: '#EFE2CF', stroke: theme.muted, cap: theme.muted };

export function WindowArt() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.window}>
      <View style={styles.frame}>
        <View style={styles.glass} />
        <View style={styles.sun} />
      </View>
      <View style={styles.sillWide} />
      <View style={styles.cluster}>
        <Bottle width={36} height={72} {...SAGE} />
        <Bottle width={32} height={56} {...CLAY} />
        <Bottle width={34} height={66} {...CREAM} />
        <View style={styles.leaf} />
      </View>
    </View>
  );
}

export function BottleShelf() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.shelf}>
      <View style={styles.shelfRow}>
        <Bottle width={26} height={48} {...SAGE} />
        <Bottle width={24} height={38} {...CLAY} />
        <Bottle width={26} height={44} {...CREAM} />
        <View style={styles.sunSmall} />
        <Bottle width={26} height={42} {...WARM} />
      </View>
      <View style={styles.sill} />
    </View>
  );
}

export function EmptyBottles() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.empty}>
      <Bottle width={28} height={52} {...SAGE} />
      <Bottle width={26} height={44} {...CLAY} />
      <Bottle width={28} height={48} {...CREAM} />
    </View>
  );
}

export function BottleBanner() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.banner}>
      <Bottle width={16} height={30} {...SAGE} />
      <Bottle width={14} height={24} {...CLAY} />
      <Bottle width={16} height={28} {...CREAM} />
      <View style={styles.sunTiny} />
    </View>
  );
}

export function BottleRow() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.row}>
      <Bottle width={22} height={40} {...SAGE} />
      <Bottle width={20} height={34} {...CLAY} />
      <Bottle width={22} height={38} {...CREAM} />
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    height: 268,
    backgroundColor: '#F3DDC6',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
    overflow: 'hidden',
  },
  frame: {
    position: 'absolute',
    top: 28,
    width: '74%',
    height: 132,
    borderRadius: 18,
    borderWidth: 8,
    borderColor: theme.teal,
    backgroundColor: '#F7E7CF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glass: {
    position: 'absolute',
    width: '86%',
    height: '76%',
    borderRadius: 8,
    backgroundColor: '#F6C98A',
  },
  sun: {
    position: 'absolute',
    right: 22,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0A35A',
  },
  sillWide: {
    width: '78%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E7C4A4',
    marginBottom: 8,
  },
  cluster: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 8, zIndex: 2 },
  leaf: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3E6B56',
    marginBottom: 8,
    marginLeft: 4,
  },
  shelf: {
    backgroundColor: '#F3DDC6',
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 8,
  },
  shelfRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  sill: { width: '84%', height: 12, borderRadius: 6, backgroundColor: '#E7C4A4' },
  sunSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0A35A',
    marginBottom: 6,
  },
  empty: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: 4 },
  banner: {
    height: 64,
    backgroundColor: '#F3DDC6',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sunTiny: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0A35A', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
});
