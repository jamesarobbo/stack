import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Screen, T } from '@/src/components/ui';
import { APP_NAME, APP_TAGLINE } from '@/src/config';
import { CLEAR_ALL_DATA_LABEL, LOAD_EXAMPLE_LABEL } from '@/src/copy/labels';
import { devToolsInProfile, openDevTools } from '@/src/devMenu';
import { currentWearableEmptyCopy } from '@/src/health/runtime';
import { useApp } from '@/src/state';
import { useTheme, useThemedStyles, type Theme } from '@/src/theme';

export default function MoreScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const latest = useMemo(() => latestMetrics(app.samples), [app.samples]);
  return (
    <Screen>
      <T weight="bold" size={32} style={styles.title}>
        {APP_NAME}
      </T>
      <T size={16} color={theme.muted}>
        {APP_TAGLINE}
      </T>
      <View style={styles.menu}>
        {app.previewPro ? (
          <Row title="Turn off Pro preview" detail="Preview is on for this device. It is not a charge." onPress={() => void app.setPreviewPro(false)} />
        ) : null}
        <Row title={app.isPro ? 'Pro is on' : 'Stack Pro'} detail={app.isPro ? 'Multi-compare, confounders, monthly report' : '$7.99/month or $59/year'} onPress={() => router.push('/paywall')} />
        <Row title="Monthly report" detail={app.isPro ? 'Keep, drop, or unclear' : 'Pro'} onPress={() => router.push('/report')} />
        <Row title={app.sessionToken ? 'Signed in' : 'Sign in'} detail={app.email || 'Syncs your supplement list only'} onPress={() => router.push('/sign-in')} />
        <Row title="Settings" detail="Username, export, and delete" onPress={() => router.push('/settings')} />
        <Row title="About results" detail="What a star on a result means" onPress={() => router.push('/results')} />
        <Row title="Privacy" detail="Health data stays on this device" onPress={() => router.push('/privacy')} last />
      </View>
      <DeveloperTools />
      <Card>
        <T weight="semibold">Wearable reads</T>
        {app.samples.length === 0 ? (
          <T size={14} color={theme.muted}>
            {currentWearableEmptyCopy()}
          </T>
        ) : (
          <>
            <T size={13} color={theme.muted}>
              {app.healthSource === 'healthkit'
                ? 'Apple Health samples on this device.'
                : app.usingSampleData
                  ? 'Example wearable days loaded from Developer tools.'
                  : 'Wearable days stored on this device.'}
            </T>
            <Metric label="Deep sleep" value={latest.deep_sleep_min} />
            <Metric label="HRV SDNN" value={latest.hrv_sdnn_ms} />
            <Metric label="Resting heart rate" value={latest.resting_hr_bpm} />
            <Metric label="VO2 max" value={latest.vo2_max} />
            <Metric label="Steps" value={latest.steps} />
            <Metric label="Active energy" value={latest.active_energy_kcal} />
          </>
        )}
      </Card>
      {app.syncNote ? (
        <T size={13} color={theme.muted}>
          {`Sync: ${app.syncNote}`}
        </T>
      ) : null}
    </Screen>
  );
}

const UNITS: Record<string, string> = {
  deep_sleep_min: 'min',
  hrv_sdnn_ms: 'ms',
  resting_hr_bpm: 'bpm',
  active_energy_kcal: 'kcal',
};

function latestMetrics(samples: { metric: string; date: string; value: number }[]) {
  const out: Record<string, string> = {};
  for (const metric of ['deep_sleep_min', 'hrv_sdnn_ms', 'resting_hr_bpm', 'vo2_max', 'steps', 'active_energy_kcal']) {
    const rows = samples.filter((sample) => sample.metric === metric).sort((a, b) => a.date.localeCompare(b.date));
    const last = rows[rows.length - 1];
    const unit = UNITS[metric] ?? '';
    out[metric] = last ? `${Math.round(last.value)}${unit ? ` ${unit}` : ''}, ${last.date}` : 'No days yet';
  }
  return out;
}

function DeveloperTools() {
  const theme = useTheme();
  const app = useApp();
  const [confirmClear, setConfirmClear] = useState(false);
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  return (
    <Card>
      <T weight="semibold">Developer tools</T>
      <T size={13} color={theme.muted}>
        Example data is off unless you load it. Loading replaces the stack, wearable days, and tags on this device.
      </T>
      <Pressable accessibilityRole="button" onPress={() => void app.restoreExample()}>
        <T weight="semibold" color={theme.teal}>
          {LOAD_EXAMPLE_LABEL}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (!confirmClear) {
            setConfirmClear(true);
            return;
          }
          setConfirmClear(false);
          void app.deleteLocal();
        }}
      >
        <T weight="semibold" color={theme.flagText}>
          {confirmClear ? 'Clear all data now' : CLEAR_ALL_DATA_LABEL}
        </T>
      </Pressable>
      {devToolsInProfile() ? (
        <Pressable accessibilityRole="button" onPress={openDevTools}>
          <T weight="semibold" color={theme.teal}>
            Expo tools
          </T>
        </Pressable>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(localStyles);
  return (
    <View style={styles.metric}>
      <T size={14}>{label}</T>
      <T size={14} weight="semibold">
        {value}
      </T>
    </View>
  );
}

function Row({ title, detail, onPress, last = false }: { title: string; detail: string; onPress: () => void; last?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, last ? styles.rowLast : null]}>
      <View style={{ flex: 1 }}>
        <T weight="semibold">{title}</T>
        <T size={13} color={theme.muted}>
          {detail}
        </T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  title: { letterSpacing: -0.8, marginTop: 4 },
  menu: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  row: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  rowLast: { borderBottomWidth: 0 },
  metric: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 28 },
});
}

