import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, T } from '@/src/components/ui';
import { useApp } from '@/src/state';
import { font, theme } from '@/src/theme';

export default function SaveStep() {
  const app = useApp();
  const [email, setEmail] = useState(app.email ?? '');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function next() {
    router.push({ pathname: '/paywall', params: { onboarding: '1' } });
  }

  return (
    <OnboardingFrame
      step="save"
      footer={
        <Pressable accessibilityRole="button" onPress={next} hitSlop={8}>
          <T size={14} color={theme.muted} style={{ textAlign: 'center' }}>
            Not now
          </T>
        </Pressable>
      }
    >
      <T weight="bold" size={30} style={styles.title}>
        Save your stack and audit
      </T>
      <T size={15} color={theme.muted}>
        Sign in keeps the supplement list you typed. Wearable samples stay on this phone.
      </T>
      {app.sessionToken ? (
        <>
          <T size={15}>{app.email || 'Signed in with Apple.'}</T>
          <Button label="Continue to Pro" onPress={next} />
        </>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={theme.faint}
            style={styles.input}
          />
          <Button
            label="Email me a code"
            onPress={async () => {
              setError(null);
              try {
                const nextCode = await app.sendEmailCode(email.trim());
                setDevCode(nextCode);
                setSent(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not send a code.');
              }
            }}
          />
          {sent ? (
            <>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="6-digit code"
                placeholderTextColor={theme.faint}
                style={styles.input}
              />
              {devCode ? (
                <T size={13} color={theme.muted}>
                  {`Development code: ${devCode}. Production does not return this.`}
                </T>
              ) : null}
              <Button
                label="Verify and save"
                onPress={async () => {
                  setError(null);
                  try {
                    await app.verifyEmailCode(email.trim(), code.trim());
                    next();
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
              tone="ghost"
              onPress={async () => {
                setError(null);
                try {
                  await app.signInWithApple();
                  next();
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
        </>
      )}
      {error ? (
        <T size={13} color={theme.flagText}>
          {error}
        </T>
      ) : null}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6 },
  input: {
    minHeight: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: theme.text,
  },
});
