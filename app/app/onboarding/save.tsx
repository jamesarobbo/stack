import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { OnboardingFrame } from '@/src/components/OnboardingProgress';
import { Button, LabeledField, T } from '@/src/components/ui';
import { useApp } from '@/src/state';
import { theme } from '@/src/theme';

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
        <Pressable accessibilityRole="button" onPress={next} style={styles.skip}>
          <T size={15} weight="semibold" color={theme.muted} style={{ textAlign: 'center' }}>
            Not now
          </T>
        </Pressable>
      }
    >
      <T weight="bold" size={32} style={styles.title}>
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
          <LabeledField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
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
              <LabeledField label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="6-digit code" />
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
  title: { letterSpacing: -0.8 },
  skip: { minHeight: 44, justifyContent: 'center' },
});
