import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useNumberPadField } from '@/src/components/NumberPadAccessory';
import { ScanCamera } from '@/src/components/ScanCamera';
import { BackButton, Button, Screen, T } from '@/src/components/ui';
import { font, radius, space, typeSize, useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function ScanScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const [torch, setTorch] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [padRef, pad] = useNumberPadField('scan-barcode');

  function lookup(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 14) {
      setError('Enter a UPC or EAN (8 to 14 digits).');
      return;
    }
    router.replace({ pathname: '/add', params: { upc: digits } });
  }

  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={30} style={styles.title}>
        Scan a barcode
      </T>
      <T size={14} color={theme.muted}>
        Point the camera at the UPC or EAN on the bottle. Stack reads the numbers and looks up the NIH label. It does not take or save a photo.
      </T>
      <ScanCamera torch={torch} onScan={lookup} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: torch }}
        onPress={() => setTorch((current) => !current)}
        style={[styles.torch, torch && styles.torchOn]}
      >
        <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={18} color={torch ? theme.teal : theme.text} />
        <T weight="semibold" color={torch ? theme.teal : theme.text}>
          {torch ? 'Torch on' : 'Torch'}
        </T>
      </Pressable>
      <T size={12} color={theme.muted}>
        Torch lights the camera on a phone.
      </T>
      <View style={{ gap: space.xs }}>
        <T size={12} weight="semibold" color={theme.muted}>
          Barcode
        </T>
        <TextInput
          ref={padRef}
          value={code}
          onChangeText={setCode}
          placeholder="088395056116"
          placeholderTextColor={theme.faint}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          clearButtonMode="while-editing"
          textContentType="none"
          {...pad}
          style={styles.input}
        />
      </View>
      {error ? (
        <T size={13} color={theme.flagText}>
          {error}
        </T>
      ) : null}
      <Button label="Look up barcode" onPress={() => lookup(code)} />
    </Screen>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.6 },
  torch: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  torchOn: { backgroundColor: theme.tealSoft, borderColor: theme.teal },
  input: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontWeight: font.regular,
    fontSize: typeSize.body,
    color: theme.text,
  },
});
}

