import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NUMBER_PAD_ACCESSORY_ID } from '@/src/components/NumberPadAccessory';
import { BackButton, Button, Card, LabeledField, Screen, T } from '@/src/components/ui';
import { useApp } from '@/src/state';
import { useTheme, useThemedStyles, type Theme } from '@/src/theme';

/** Back to the screen that asked for sign-in, for example a shared stack waiting to be copied. */
function returnAfterSignIn() {
  if (router.canGoBack()) router.back();
}

export default function SignInScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const [email, setEmail] = useState(app.email ?? '');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (app.sessionToken) {
    return (
      <Screen>
        <BackButton />
        <T weight="semibold" size={32} style={styles.title}>
          Signed in
        </T>
        <T size={15} color={theme.muted}>
          {app.email || 'Apple account'}
        </T>
        <Card>
          <T size={14}>
            Signing in syncs the supplement list you typed. Sleep, heart rate, steps, and the other wearable samples stay on this device. A shared result sends only its headline, and only when you choose it.
          </T>
        </Card>
        <Button label="Sign out" kind="plain" onPress={() => void app.signOut()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton />
      <T weight="semibold" size={32} style={styles.title}>
        Sign in
      </T>
      <T size={15} color={theme.muted}>
        Email code, or Sign in with Apple on iPhone. Health data is not part of the account.
      </T>
      <LabeledField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        placeholder="you@example.com"
      />
      <Button
        label="Email me a code"
        onPress={async () => {
          setError(null);
          try {
            const next = await app.sendEmailCode(email.trim());
            setDevCode(next);
            setSent(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send a code.');
          }
        }}
      />
      {sent ? (
        <>
          <LabeledField label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" returnKeyType="done" placeholder="6-digit code" inputAccessoryViewID={NUMBER_PAD_ACCESSORY_ID} />
          {devCode ? (
            <T size={13} color={theme.muted}>
              {`Development code: ${devCode}. Production does not return this.`}
            </T>
          ) : null}
          <Button
            label="Verify code"
            onPress={async () => {
              setError(null);
              try {
                await app.verifyEmailCode(email.trim(), code.trim());
                returnAfterSignIn();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'That code did not work.');
              }
            }}
          />
        </>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Button
          label="Sign in with Apple"
          kind="secondary"
          onPress={async () => {
            setError(null);
            try {
              await app.signInWithApple();
              returnAfterSignIn();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Apple sign-in failed.');
            }
          }}
        />
      ) : (
        <T size={13} color={theme.muted}>
          Sign in with Apple is available on iPhone.
        </T>
      )}
      {error ? (
        <T size={13} color={theme.flagText}>
          {error}
        </T>
      ) : null}
    </Screen>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.8 },
});
}

