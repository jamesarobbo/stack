import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { normalizeUsername, usernameFormatError } from '../../../shared/username';
import { api, ApiError } from '../api';
import { fontFamily, control, font, radius, space, typeSize, useTheme, useThemedStyles, type Theme } from '../theme';
import { Button, T } from './ui';

type Check = { name: string; available: boolean; error?: string };

/** One username field with a live availability check. The save button stays off until the name is free. */
export function UsernameField({
  token,
  current,
  onSaved,
}: {
  token: string;
  current: string | null;
  onSaved: (username: string) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const [value, setValue] = useState(current ? `@${current}` : '');
  const [remote, setRemote] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const formatError = usernameFormatError(value);
  const normalized = normalizeUsername(value);
  const own = !!current && normalized === current;
  const checked = remote?.name === normalized ? remote : null;

  useEffect(() => {
    if (usernameFormatError(value)) return;
    const name = normalizeUsername(value);
    if (!name || (current != null && name === current)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void api<{ available: boolean; error?: string }>(`/v1/usernames/available?name=${encodeURIComponent(name)}`, { token })
        .then((body) => {
          if (!cancelled) setRemote({ name, available: body.available, error: body.error });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setRemote({ name, available: false, error: error instanceof ApiError ? error.message : 'That username could not be checked.' });
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, token, current]);

  const status = formatError
    ? formatError
    : own
      ? 'This is your username.'
      : checked
        ? checked.available
          ? 'Available'
          : (checked.error ?? 'That username is not available.')
        : normalized
          ? 'Checking'
          : null;
  const ok = !formatError && !own && checked?.available === true;
  const problem = !!formatError || (checked != null && !checked.available);

  async function save() {
    if (!ok) return;
    setBusy(true);
    setSaveError(null);
    try {
      const saved = await api<{ username: string }>('/v1/me/username', { method: 'PUT', token, body: { username: normalized } });
      onSaved(saved.username);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : 'That username could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <TextInput
        value={value}
        onChangeText={(next) => {
          setSaveError(null);
          setValue(next);
        }}
        placeholder="sam_lifts"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="done"
        clearButtonMode="while-editing"
        accessibilityLabel="Username"
        style={styles.input}
      />
      <T size={13} color={theme.muted}>
        3 to 20 letters, numbers, or underscores.
      </T>
      {status ? (
        <View accessibilityLiveRegion="polite">
          <T size={14} weight="semibold" color={problem ? theme.flagText : ok ? theme.action : theme.muted}>
            {status}
          </T>
        </View>
      ) : null}
      {saveError ? (
        <T size={14} color={theme.flagText}>
          {saveError}
        </T>
      ) : null}
      <Button label={busy ? 'Saving' : 'Save username'} disabled={!ok || busy} onPress={() => void save()} />
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
    input: {
      backgroundColor: theme.bg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      minHeight: control.height,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      fontFamily, fontWeight: font.regular,
      fontSize: typeSize.body,
      color: theme.text,
    },
  });
}
