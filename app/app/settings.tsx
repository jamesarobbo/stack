import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { currencyName } from '../../shared/money';
import { DailyReminderCard } from '@/src/components/DailyReminderCard';
import { Chip } from '@/src/components/share';
import { UsernameField } from '@/src/components/UsernameField';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import { APP_NAME } from '@/src/config';
import { syncProfile } from '@/src/data/profile';
import { AGE_RANGES, SEXES, isAgeRange, isSex } from '@/src/health/demographics';
import { DSLD_ATTRIBUTION, DSLD_URL, OFF_ATTRIBUTION, OFF_URL } from '@/src/data/labels';
import { useApp } from '@/src/state';
import { getSetting, setSetting, settingsDriverKind } from '@/src/settings';
import { control, font, radius, space, typeSize, useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const [name, setName] = useState(app.displayName);
  const [username, setUsername] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ageRange, setAgeRange] = useState(getSetting('ageRange'));
  const [sex, setSex] = useState(getSetting('sex'));
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [accountNote, setAccountNote] = useState<string | null>(null);

  useEffect(() => {
    if (!app.sessionToken) return;
    void api<{ profile: { username: string | null } }>('/v1/me', { token: app.sessionToken })
      .then((body) => setUsername(body.profile.username))
      .catch(() => undefined);
  }, [app.sessionToken]);

  async function saveAbout(next: { ageRange?: string; sex?: string }) {
    if (next.ageRange && isAgeRange(next.ageRange)) {
      setAgeRange(next.ageRange);
      await setSetting('ageRange', next.ageRange);
    }
    if (next.sex && isSex(next.sex)) {
      setSex(next.sex);
      await setSetting('sex', next.sex);
    }
    await syncProfile(app.sessionToken).catch(() => undefined);
  }

  async function clearBlocks() {
    try {
      await api('/v1/me/blocks', { method: 'DELETE', token: app.sessionToken });
      setAccountNote('Blocked creators cleared.');
    } catch (error) {
      setAccountNote(error instanceof ApiError ? error.message : 'That did not work. Try again.');
    }
  }

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
      <DailyReminderCard />
      <Card>
        <Pressable accessibilityRole="button" accessibilityLabel="Currency" onPress={() => router.push('/currency')} style={styles.currencyRow}>
          <View style={{ flex: 1 }}>
            <T weight="semibold">Currency</T>
            <T size={13} color={theme.muted}>
              {currencyName(app.currency)}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.muted} />
        </Pressable>
        <T size={13} color={theme.muted}>
          New prices use this currency. Saved prices stay in the currency they were entered in.
        </T>
      </Card>
      <Card>
        <T weight="semibold">Username</T>
        <T size={13} color={theme.muted}>
          {app.sessionToken
            ? 'Shown as @name on a shared stack, in Discover, and on the link preview. You can change it a few times a day.'
            : 'Sign in to choose the username shown when you share. Your real name is not used.'}
        </T>
        {app.sessionToken ? <UsernameField token={app.sessionToken} current={username} onSaved={setUsername} /> : null}
      </Card>
      <Card>
        <T weight="semibold">Name on this device</T>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          accessibilityLabel="Name on this device"
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="done"
          clearButtonMode="while-editing"
        />
        <T size={13} color={theme.muted}>
          Used as the heading of My Stack on this device. It is not shown when you share.
        </T>
        <Button label="Save name" onPress={() => void app.setName(name)} />
      </Card>
      <Card>
        <T weight="semibold">About you</T>
        <T size={13} color={theme.muted}>
          {"Used for Discover's people like you and for grouped results. Never shown on a shared page or sent to analytics."}
        </T>
        <T size={13} weight="semibold" color={theme.muted}>
          Age range
        </T>
        <View style={styles.chips}>
          {AGE_RANGES.map((option) => (
            <Chip key={option.key} label={option.label} selected={ageRange === option.key} onPress={() => void saveAbout({ ageRange: option.key })} />
          ))}
        </View>
        <T size={13} weight="semibold" color={theme.muted}>
          Sex
        </T>
        <View style={styles.chips}>
          {SEXES.map((option) => (
            <Chip key={option.key} label={option.label} selected={sex === option.key} onPress={() => void saveAbout({ sex: option.key })} />
          ))}
        </View>
      </Card>
      <Card>
        <T weight="semibold">On this device</T>
        <T size={14} color={theme.muted}>
          {`Settings store: ${settingsDriverKind === 'mmkv' ? 'MMKV' : settingsDriverKind === 'localStorage' ? 'browser storage' : 'SQLite fallback'}. Health samples are not uploaded.`}
        </T>
        <T size={14} color={theme.muted}>
          {app.usingSampleData
            ? 'The stack and wearable days are the fictional example from Developer tools.'
            : 'Your stack starts empty. Add what you take.'}
        </T>
        {app.previewPro ? (
          <Button label="Turn off Pro preview" kind="plain" onPress={() => void app.setPreviewPro(false)} />
        ) : null}
        <Button label="Export my data" kind="plain" onPress={() => void exportData()} />
      </Card>
      {app.sessionToken ? (
        <Card>
          <T weight="semibold">Account</T>
          <T size={14} color={theme.muted}>
            Upload and download move the supplement list only.
          </T>
          <Button label="Upload stack" kind="plain" onPress={() => void app.uploadStack()} />
          <Button
            label="Download saved stack"
            kind="plain"
            onPress={() => {
              Alert.alert('Replace this device?', 'This replaces the products on this device with the saved account copy. Health samples stay here.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replace', style: 'destructive', onPress: () => void app.downloadStack() },
              ]);
            }}
          />
          <Button label="Clear blocked creators" kind="plain" onPress={() => void clearBlocks()} />
          {confirmAccount ? (
            <>
              <T size={14} color={theme.muted}>
                This deletes your account, your shared link, saves, copies, and any results you sent. This device keeps its data.
              </T>
              <Button label="Delete my account" kind="destructive" onPress={() => void app.deleteAccount().then(() => setConfirmAccount(false))} />
              <Button label="Cancel" kind="secondary" onPress={() => setConfirmAccount(false)} />
            </>
          ) : (
            <Button label="Delete account" kind="destructive" onPress={() => setConfirmAccount(true)} />
          )}
          {accountNote ? (
            <T size={13} color={theme.muted}>
              {accountNote}
            </T>
          ) : null}
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
            kind="destructive"
            onPress={async () => {
              await app.deleteLocal();
              setConfirmDelete(false);
            }}
          />
        ) : (
          <Button label="Delete local data" kind="destructive" onPress={() => setConfirmDelete(true)} />
        )}
      </Card>
      <Card>
        <T weight="semibold">About label data</T>
        <T size={14} color={theme.muted}>
          Product search uses the NIH Office of Dietary Supplements Dietary Supplement Label Database. A barcode NIH does not have can use Open Food Facts for the name and brand. You still check the doses on the bottle. The app asks our server, which keeps a short cache, so your phone does not call those sites directly.
        </T>
        <T size={13} color={theme.muted}>
          {DSLD_ATTRIBUTION}
        </T>
        <Button label="dsld.od.nih.gov" kind="plain" onPress={() => void Linking.openURL(DSLD_URL)} />
        <T size={13} color={theme.muted}>
          {OFF_ATTRIBUTION}
        </T>
        <Button label="openfoodfacts.org" kind="plain" onPress={() => void Linking.openURL(OFF_URL)} />
      </Card>
      <T size={13} color={theme.muted}>
        {`${APP_NAME}. Educational wellness log. Not a medical device.`}
      </T>
    </Screen>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.6 },
  currencyRow: { minHeight: control.height, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    backgroundColor: theme.bg,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontWeight: font.regular,
    fontSize: typeSize.body,
    color: theme.text,
  },
});
}

