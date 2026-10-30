import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ScanCamera } from '@/src/components/ScanCamera';
import { BackButton, Button, Screen, T } from '@/src/components/ui';
import { font, theme } from '@/src/theme';

export default function ScanScreen() {
  const [torch, setTorch] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      <View style={{ gap: 4 }}>
        <T size={12} weight="semibold" color={theme.muted}>
          Barcode
        </T>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="088395056116"
          placeholderTextColor={theme.faint}
          keyboardType="number-pad"
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

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6 },
  torch: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  torchOn: { backgroundColor: theme.tealSoft, borderColor: theme.teal },
  input: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: theme.text,
  },
});
