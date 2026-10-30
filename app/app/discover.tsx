import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BackButton, Button, Card, Screen, T } from '@/src/components/ui';
import { api } from '@/src/api';
import {
  DISCOVER_LABEL,
  LIBRARY_GOALS,
  LIBRARY_SORTS,
  LIBRARY_TABS,
  type LibraryGoalKey,
} from '@/src/copy/library';
import { copyCountLabel } from '@/src/copy/sharing';
import { getSetting } from '@/src/settings';
import { useApp } from '@/src/state';
import { font, theme } from '@/src/theme';

type LibraryItem = {
  slug: string;
  stackName: string;
  creatorName: string | null;
  goals: { key: string; label: string }[];
  auditScore: number;
  copyCount: number;
  recentCopies: number;
  saved: boolean;
  likeYou: { averagePercent: number; people: number; cohort: string } | null;
};

type LibraryPage = { items: LibraryItem[]; nextOffset: number | null; note: string | null };

export default function DiscoverScreen() {
  const app = useApp();
  const [tab, setTab] = useState<(typeof LIBRARY_TABS)[number]['key']>('new');
  const [sort, setSort] = useState<(typeof LIBRARY_SORTS)[number]['key']>('newest');
  const [query, setQuery] = useState('');
  const [goal, setGoal] = useState<LibraryGoalKey | null>(null);
  const [page, setPage] = useState<LibraryPage>({ items: [], nextOffset: null, note: null });

  useEffect(() => {
    const params = new URLSearchParams({ tab, sort, limit: '20' });
    if (query.trim()) params.set('q', query.trim());
    if (goal) params.set('goal', goal);
    if (sort === 'like_you') {
      const ageRange = getSetting('ageRange');
      const sex = getSetting('sex');
      if (ageRange) params.set('ageRange', ageRange);
      if (sex) params.set('sex', sex);
    }
    let live = true;
    void api<LibraryPage>(`/v1/library?${params.toString()}`, { token: app.sessionToken })
      .then((body) => {
        if (live) setPage(body);
      })
      .catch(() => {
        if (live) setPage({ items: [], nextOffset: null, note: 'Discover could not be loaded.' });
      });
    return () => {
      live = false;
    };
  }, [app.sessionToken, goal, query, sort, tab]);

  function openTab(next: (typeof LIBRARY_TABS)[number]['key']) {
    setTab(next);
    if (next === 'top') setSort('copies');
    if (next === 'new') setSort('newest');
  }

  async function toggleSave(item: LibraryItem) {
    if (!app.sessionToken) {
      router.push('/sign-in');
      return;
    }
    await api(`/v1/shares/${item.slug}/save`, { method: item.saved ? 'DELETE' : 'POST', token: app.sessionToken });
    setPage((current) => ({
      ...current,
      items: current.items.map((row) => (row.slug === item.slug ? { ...row, saved: !row.saved } : row)),
    }));
  }

  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={32} style={styles.title}>
        {DISCOVER_LABEL}
      </T>
      <T size={15} color={theme.muted}>
        Stacks people chose to list. Link-only shares stay off this page.
      </T>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search stacks, ingredients, or people"
        placeholderTextColor={theme.faint}
        autoCapitalize="none"
        accessibilityLabel="Search stacks"
        style={styles.search}
      />
      <View style={styles.chips}>
        {LIBRARY_GOALS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => setGoal((current) => (current === item.key ? null : item.key))}
            style={[styles.chip, goal === item.key ? styles.chipOn : null]}
          >
            <T size={13} weight="semibold" color={goal === item.key ? '#fff' : theme.text}>
              {item.label}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={styles.tabs}>
        {LIBRARY_TABS.map((item) => (
          <Pressable key={item.key} accessibilityRole="button" onPress={() => openTab(item.key)} style={styles.tab}>
            <T weight="semibold" color={tab === item.key ? theme.teal : theme.muted}>
              {item.label}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={styles.chips}>
        {LIBRARY_SORTS.map((item) => (
          <Pressable key={item.key} accessibilityRole="button" onPress={() => setSort(item.key)} style={[styles.chip, sort === item.key ? styles.chipOn : null]}>
            <T size={13} weight="semibold" color={sort === item.key ? '#fff' : theme.text}>
              {item.label}
            </T>
          </Pressable>
        ))}
      </View>
      {sort === 'copies' || tab === 'top' ? (
        <T size={13} color={theme.muted}>
          Top uses copies from the last 30 days.
        </T>
      ) : null}
      {page.note ? (
        <T size={14} color={theme.muted}>
          {page.note}
        </T>
      ) : null}
      {page.items.map((item) => (
        <Card key={item.slug}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/s/${item.slug}`)}>
            <T weight="semibold" size={18}>
              {item.stackName}
            </T>
            <T size={13} color={theme.muted}>
              {item.creatorName || 'A Stack user'}
            </T>
            {item.goals.length > 0 ? (
              <T size={13} color={theme.muted}>
                {item.goals.map((goalItem) => goalItem.label).join(', ')}
              </T>
            ) : null}
            <T weight="bold" size={28} color={theme.teal}>
              {String(item.auditScore)}
            </T>
            <T size={13} color={theme.muted}>
              Audit score
            </T>
            <T size={14}>{copyCountLabel(item.copyCount)}</T>
            <T size={13} color={theme.muted}>
              {`${item.recentCopies} in the last 30 days`}
            </T>
            {item.likeYou ? (
              <T size={14}>
                {`${item.likeYou.cohort}. Average change ${changePhrase(item.likeYou.averagePercent)} across ${item.likeYou.people} people. Real-world data, not a trial.`}
              </T>
            ) : null}
          </Pressable>
          <Button label={item.saved ? 'Saved' : 'Save'} tone="ghost" onPress={() => void toggleSave(item)} />
        </Card>
      ))}
      {page.items.length === 0 && !page.note ? (
        <Card>
          <T>No listed stacks yet.</T>
        </Card>
      ) : null}
    </Screen>
  );
}

function changePhrase(percent: number): string {
  if (percent <= -1) return `down ${Math.abs(percent)}%`;
  if (percent >= 1) return `up ${percent}%`;
  return 'about the same';
}

const styles = StyleSheet.create({
  title: { letterSpacing: -0.6 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: theme.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF0F3' },
  chipOn: { backgroundColor: theme.teal, borderColor: theme.teal },
  tabs: { flexDirection: 'row', gap: 16 },
  tab: { paddingVertical: 4 },
});
