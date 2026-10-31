import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { EngagementStats, engagementPhrase } from '@/src/components/EngagementStats';
import { ProductChips } from '@/src/components/ProductChips';
import { Chip, FadeIn, ResultLine, ScoreRing, scoreTone, Segmented } from '@/src/components/share';
import { Button, Card, EmptyLead, Screen, T } from '@/src/components/ui';
import { api, ApiError } from '@/src/api';
import {
  DISCOVER_EMPTY_BODY,
  DISCOVER_EMPTY_TITLE,
  DISCOVER_SPARSE,
  LIBRARY_GOALS,
  LIBRARY_SEGMENTS,
  type LibraryGoalKey,
  type LibrarySegmentKey,
} from '@/src/copy/library';
import { sharerName } from '@/src/copy/sharing';
import { GROUP_RESULT_NOTE, PERSONAL_RESULT_NOTE } from '../../../shared/outcome';
import type { LibraryItem, LibraryPage } from '@/src/data/sharing';
import { formatUsDate } from '@/src/dates';
import { useApp } from '@/src/state';
import { control, font, radius, space, typeSize, useTheme, useThemedStyles, type Theme } from '@/src/theme';

const PAGE = 20;

export default function DiscoverScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
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
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.muted} />
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder="Search stacks, ingredients, or people"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          textContentType="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Search stacks"
          style={styles.searchInput}
        />
        {typed ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setTyped('')} hitSlop={8} style={styles.clear}>
            <Ionicons name="close-circle" size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>
      <Segmented items={LIBRARY_SEGMENTS} value={segment} onChange={setSegment} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {LIBRARY_GOALS.map((item) => (
          <Chip key={item.key} label={item.label} selected={goal === item.key} onPress={() => setGoal((current) => (current === item.key ? null : item.key))} />
        ))}
      </ScrollView>

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
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const phrase = engagementPhrase(item.copyCount, item.viewCount);
  const tone = scoreTone(item.auditScore);
  const open = () => router.push(`/s/${item.slug}`);
  return (
    <View style={styles.card}>
      <View style={[styles.cardTop, styles.pad]}>
        <View style={{ flex: 1, gap: space.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[`${item.stackName}, dose score ${item.auditScore}`, phrase].filter(Boolean).join(', ')}
            onPress={open}
            style={({ pressed }) => [pressed ? { opacity: 0.92 } : null]}
          >
            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <ScoreRing
                  score={item.auditScore}
                  size={72}
                  stroke={8}
                  color={tone === 'good' ? theme.good : theme.score}
                  track={theme.scoreTrack}
                  textColor={theme.text}
                  subColor={theme.muted}
                />
                <View style={{ flex: 1, gap: space.xs }}>
                  <T weight="bold" size={18} style={{ letterSpacing: -0.3 }}>
                    {item.stackName}
                  </T>
                  <T size={13} color={theme.muted}>
                    {`${sharerName(item.creatorName)}, ${item.productCount} ${item.productCount === 1 ? 'product' : 'products'}`}
                  </T>
                </View>
              </View>
              <ProductChips names={item.productNames ?? []} />
            </View>
          </Pressable>
          {item.outcomeLine ? <ResultLine line={item.outcomeLine} note={PERSONAL_RESULT_NOTE} /> : null}
          {phrase ? (
            <Pressable accessibilityRole="button" accessibilityLabel={phrase} onPress={open} style={({ pressed }) => [pressed ? { opacity: 0.92 } : null]}>
              <EngagementStats copies={item.copyCount} views={item.viewCount} />
            </Pressable>
          ) : null}
        </View>
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
      {item.likeYou || item.goals.length > 0 || item.updatedOn ? (
        <View style={[styles.padBottom, { gap: space.sm }]}>
          {item.likeYou ? (
            <View style={styles.likeYou}>
              <T size={13} weight="semibold" color={theme.teal}>
                {item.likeYou.label}
              </T>
              <ResultLine line={item.likeYou.line} note={GROUP_RESULT_NOTE} size={13} />
            </View>
          ) : null}
          {item.goals.length > 0 || item.updatedOn ? (
            <T size={12} color={theme.muted}>
              {[item.goals.map((goal) => goal.label).join(', '), item.updatedOn ? `Updated on ${formatUsDate(item.updatedOn)}` : null].filter(Boolean).join('. ')}
            </T>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: control.height,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, minHeight: control.height, paddingVertical: space.md, fontWeight: font.regular, fontSize: typeSize.body, color: theme.text },
  clear: { minWidth: 44, minHeight: control.height, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: space.sm, paddingRight: 8 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line, gap: space.md, overflow: 'hidden', paddingTop: 16 },
  pad: { paddingHorizontal: space.lg },
  padBottom: { paddingHorizontal: space.lg, paddingBottom: 16 },
  cardTop: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  save: { minWidth: 44, minHeight: control.height, alignItems: 'center', justifyContent: 'center' },
  likeYou: { backgroundColor: theme.tealSoft, borderRadius: radius.md, padding: space.md, gap: space.xxs },
});
}

