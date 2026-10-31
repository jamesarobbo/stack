import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Chip, CompositionStrip, FadeIn, ScoreBadge, Segmented } from '@/src/components/share';
import { BottleBanner } from '@/src/components/illustrations';
import { Button, Card, EmptyLead, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import {
  DISCOVER_EMPTY_BODY,
  DISCOVER_EMPTY_TITLE,
  DISCOVER_LEAD,
  DISCOVER_SPARSE,
  LIBRARY_GOALS,
  LIBRARY_SEGMENTS,
  SEGMENT_NOTES,
  type LibraryGoalKey,
  type LibrarySegmentKey,
} from '@/src/copy/library';
import { copyCountLabel } from '@/src/copy/sharing';
import type { LibraryItem, LibraryPage } from '@/src/data/sharing';
import { formatUsDate } from '@/src/dates';
import { useApp } from '@/src/state';
import { font, theme } from '@/src/theme';

const PAGE = 20;

export default function DiscoverScreen() {
  const app = useApp();
  const [segment, setSegment] = useState<LibrarySegmentKey>('top');
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [goal, setGoal] = useState<LibraryGoalKey | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const request = useRef(0);
  const key = `${segment}|${query}|${goal ?? ''}|${app.sessionToken ?? ''}`;
  const loading = loadedKey !== key;
  const filtered = query.length > 0 || goal != null;
  const sparse = !loading && !filtered && !note && nextOffset == null && items.length > 0 && items.length < 3;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed.trim()), 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({ segment, limit: String(PAGE), offset: String(offset) });
      if (query) params.set('q', query);
      if (goal) params.set('goal', goal);
      return api<LibraryPage>(`/v1/library?${params.toString()}`, { token: app.sessionToken });
    },
    [app.sessionToken, goal, query, segment],
  );

  useEffect(() => {
    const id = ++request.current;
    fetchPage(0)
      .then((page) => {
        if (id !== request.current) return;
        setItems(page.items);
        setNextOffset(page.nextOffset);
        setNote(page.note);
      })
      .catch((error: unknown) => {
        if (id !== request.current) return;
        setItems([]);
        setNextOffset(null);
        setNote(error instanceof ApiError ? error.message : 'Discover could not be loaded.');
      })
      .finally(() => {
        if (id === request.current) setLoadedKey(key);
      });
  }, [fetchPage, key]);

  async function loadMore() {
    if (nextOffset == null) return;
    const id = request.current;
    try {
      const page = await fetchPage(nextOffset);
      if (id !== request.current) return;
      setItems((list) => [...list, ...page.items.filter((item) => !list.some((row) => row.slug === item.slug))]);
      setNextOffset(page.nextOffset);
    } catch {
      setNote('More stacks could not be loaded.');
    }
  }

  async function toggleSave(item: LibraryItem) {
    if (!app.sessionToken) {
      router.push('/sign-in');
      return;
    }
    try {
      await api(`/v1/shares/${item.slug}/save`, { method: item.saved ? 'DELETE' : 'POST', token: app.sessionToken });
      setItems((list) =>
        segment === 'saved' && item.saved
          ? list.filter((row) => row.slug !== item.slug)
          : list.map((row) => (row.slug === item.slug ? { ...row, saved: !row.saved } : row)),
      );
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'That could not be saved.');
    }
  }

  return (
    <Screen>
      <T size={16} color={theme.muted}>
        {DISCOVER_LEAD}
      </T>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.faint} />
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder="Search stacks, ingredients, or people"
          placeholderTextColor={theme.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search stacks"
          style={styles.searchInput}
        />
        {typed ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setTyped('')} hitSlop={8} style={styles.clear}>
            <Ionicons name="close-circle" size={18} color={theme.faint} />
          </Pressable>
        ) : null}
      </View>
      <Segmented items={LIBRARY_SEGMENTS} value={segment} onChange={setSegment} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {LIBRARY_GOALS.map((item) => (
          <Chip key={item.key} label={item.label} selected={goal === item.key} onPress={() => setGoal((current) => (current === item.key ? null : item.key))} />
        ))}
      </ScrollView>
      <T size={13} color={theme.muted}>
        {SEGMENT_NOTES[segment]}
      </T>

      {note && items.length === 0 && !loading ? (
        <Card>
          <T>{note}</T>
          {!app.sessionToken && (segment === 'saved' || segment === 'like_you') ? <Button label="Sign in" onPress={() => router.push('/sign-in')} /> : null}
          {app.sessionToken && segment === 'like_you' && /age range/.test(note) ? (
            <Button label="Open settings" tone="ghost" onPress={() => router.push('/settings')} />
          ) : null}
        </Card>
      ) : null}
      {loading && items.length === 0 ? (
        <T size={14} color={theme.muted}>
          Loading stacks
        </T>
      ) : null}

      {items.map((item, index) => (
        <FadeIn key={item.slug} delay={Math.min(index, 6) * 50}>
          <StackCard item={item} onSave={() => void toggleSave(item)} />
        </FadeIn>
      ))}

      {sparse ? (
        <T size={14} color={theme.muted}>
          {DISCOVER_SPARSE}
        </T>
      ) : null}
      {!loading && items.length === 0 && !note && !filtered ? (
        <EmptyLead title={DISCOVER_EMPTY_TITLE} body={DISCOVER_EMPTY_BODY} />
      ) : null}
      {nextOffset != null ? <Button label="Load more" tone="ghost" onPress={() => void loadMore()} /> : null}
    </Screen>
  );
}

function StackCard({ item, onSave }: { item: LibraryItem; onSave: () => void }) {
  const kept = copyCountLabel(item.copyCount);
  const open = () => router.push(`/s/${item.slug}`);
  return (
    <View style={styles.card}>
      <BottleBanner />
      <View style={[styles.cardTop, styles.pad]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.stackName}, audit score ${item.auditScore}`}
          onPress={open}
          style={({ pressed }) => [styles.cardMain, pressed ? { opacity: 0.92 } : null]}
        >
          <ScoreBadge score={item.auditScore} size={68} />
          <View style={{ flex: 1, gap: 3 }}>
            <T weight="bold" size={18} style={{ letterSpacing: -0.3 }}>
              {item.stackName}
            </T>
            <T size={13} color={theme.muted}>
              {`${item.creatorName || 'A Stack user'}, ${item.productCount} ${item.productCount === 1 ? 'product' : 'products'}`}
            </T>
            <T size={14} weight="semibold">
              {item.summary}
            </T>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.saved ? 'Remove from saved' : 'Save'}
          onPress={onSave}
          hitSlop={6}
          style={styles.save}
        >
          <Ionicons name={item.saved ? 'bookmark' : 'bookmark-outline'} size={20} color={theme.teal} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.stackName}`} onPress={open} style={({ pressed }) => [styles.padBottom, pressed ? { opacity: 0.92 } : null]}>
        <View style={{ gap: 14 }}>
          <CompositionStrip items={item.composition} />
          {item.likeYou ? (
            <View style={styles.likeYou}>
              <T size={13} weight="semibold" color={theme.tealDark}>
                {item.likeYou.label}
              </T>
              <T size={13}>{item.likeYou.line}</T>
            </View>
          ) : null}
          {item.goals.length > 0 || kept || item.updatedOn ? (
            <T size={12} color={theme.muted}>
              {[item.goals.map((goal) => goal.label).join(', '), kept, item.updatedOn ? `Updated on ${formatUsDate(item.updatedOn)}` : null].filter(Boolean).join('. ')}
            </T>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minHeight: 44, paddingVertical: 12, fontFamily: font.regular, fontSize: 16, color: theme.text },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingRight: 8 },
  card: { backgroundColor: theme.card, borderRadius: 22, borderWidth: 1, borderColor: theme.line, gap: 14, overflow: 'hidden' },
  pad: { paddingHorizontal: 16 },
  padBottom: { paddingHorizontal: 16, paddingBottom: 16 },
  cardTop: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  cardMain: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  save: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  likeYou: { backgroundColor: theme.tealSoft, borderRadius: 12, padding: 10, gap: 2 },
});
