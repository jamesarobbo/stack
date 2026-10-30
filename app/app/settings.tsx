import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { APP_NAME } from '@/src/config';
import { DSLD_ATTRIBUTION, DSLD_URL } from '@/src/data/labels';
import { useApp } from '@/src/state';
import { settingsDriverKind } from '@/src/settings';
import { font, theme } from '@/src/theme';

export default function SettingsScreen() {
  const app = useApp();
  const [name, setName] = useState(app.displayName);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function exportData() {
    const json = await app.exportData();
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'stack-export.json';
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    const file = new File(Paths.cache, 'stack-export.json');
    if (!file.exists) file.create();
    await file.write(json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    }
  }

  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={32} style={styles.title}>
        Settings
      </T>
      <Card>
        <T size={12} weight="semibold" color={theme.muted}>
          Name on the stack
        </T>
        <TextInput value={name} onChangeText={setName} style={styles.input} />
        <Button label="Save name" onPress={() => void app.setName(name)} />
      </Card>
      <Card>
        <T weight="semibold">On this device</T>
        <T size={14} color={theme.muted}>
          {`Settings store: ${settingsDriverKind === 'mmkv' ? 'MMKV' : settingsDriverKind === 'localStorage' ? 'browser storage' : 'SQLite fallback'}. Health samples are not uploaded.`}
        </T>
        <T size={14} color={theme.muted}>
          {app.usingSampleData ? 'The stack and wearable days are the fictional example.' : 'You have changed the example data.'}
        </T>
        <Pressable accessibilityRole="button" onPress={() => void exportData()}>
          <T weight="semibold" color={theme.teal}>
            Export my data
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void app.restoreExample()}>
          <T weight="semibold" color={theme.teal}>
            Load the example stack
          </T>
        </Pressable>
      </Card>
      {app.sessionToken ? (
        <Card>
          <T weight="semibold">Account</T>
          <T size={14} color={theme.muted}>
            Upload and download move the supplement list only.
          </T>
          <Pressable accessibilityRole="button" onPress={() => void app.uploadStack()}>
            <T weight="semibold" color={theme.teal}>
              Upload stack
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Alert.alert('Replace this device?', 'This replaces the products on this device with the saved account copy. Health samples stay here.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replace', style: 'destructive', onPress: () => void app.downloadStack() },
              ]);
            }}
          >
            <T weight="semibold" color={theme.teal}>
              Download saved stack
            </T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void app.deleteAccount()}>
            <T weight="semibold" color={theme.flagText}>
              Delete account
            </T>
          </Pressable>
        </Card>
      ) : null}
      <Card>
        <T weight="semibold">Delete data on this device</T>
        <T size={14} color={theme.muted}>
          Removes products, wearable samples, tags, and settings stored here. This does not delete an account by itself.
        </T>
        {confirmDelete ? (
          <Button
            label="Delete everything on this device"
            onPress={async () => {
              await app.deleteLocal();
              setConfirmDelete(false);
            }}
          />
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)}>
            <T weight="semibold" color={theme.flagText}>
              Delete local data
            </T>
          </Pressable>
        )}
      </Card>
      <Card>
        <T weight="semibold">About label data</T>
        <T size={14} color={theme.muted}>
          Product search and barcode lookup use the NIH Office of Dietary Supplements Dietary Supplement Label Database. The app asks our server, which caches labels, so your phone does not call NIH directly.
        </T>
        <T size={13} color={theme.muted}>
          {DSLD_ATTRIBUTION}
        </T>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(DSLD_URL)}>
          <T weight="semibold" color={theme.teal}>
            dsld.od.nih.gov
          </T>
        </Pressable>
      </Card>
      <T size={12} color={theme.faint}>
        {`${APP_NAME} · educational wellness log · not a medical device`}
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6 },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: theme.text,
  },
});
