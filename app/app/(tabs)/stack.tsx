import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScoreBadge } from '@/src/components/share';
import { ReminderOffer } from '@/src/components/DailyReminderCard';
import { LogTodayCard } from '@/src/components/LogTodayCard';
import { Card, Pill, ProductRow, ShareButton, T } from '@/src/components/ui';
import { APP_NAME } from '@/src/config';
import { ADD_SUPPLEMENT_LABEL, ADD_SUPPLEMENT_ROUTE, stackHeading } from '@/src/copy/labels';
import { auditStack } from '@/src/domain/audit';
import { scoreProducts } from '@/src/domain/auditScore';
import { formatMoney } from '@/src/format';
import { joinMoney } from '../../../shared/money';
import { isValidTime } from '../../../shared/reminders';
import { requestReminderAccess } from '@/src/reminders/notify';
import { useApp } from '@/src/state';
import { space, useTheme, useThemedStyles, type Theme } from '@/src/theme';

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function StackScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(localStyles);
  const app = useApp();
  const insets = useSafeAreaInsets();
  const audit = useMemo(() => auditStack(app.products), [app.products]);
  const scored = useMemo(() => scoreProducts(app.products), [app.products]);
  const title = stackHeading(app.displayName);
  const openAdd = () => router.push(ADD_SUPPLEMENT_ROUTE);
  const showOffer = app.reminderOffer && app.products.length > 0 && !app.usingSampleData;
  const showCheckIn = app.products.length > 0 && (app.dailyReminder || app.logs.length > 0);
  const showLogToday = app.products.length > 0 && !showCheckIn && !showOffer;
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <T weight="bold" size={34} style={styles.title}>
            {title}
          </T>
          {app.products.length > 0 ? <ShareButton onPress={() => router.push('/share')} /> : null}
        </View>
        <T size={14} color={theme.muted}>
          {APP_NAME} adds up what the labels say you pay.
        </T>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {showCheckIn || showLogToday ? (
          <LogTodayCard
            mode={showCheckIn ? 'checkIn' : 'promo'}
            products={app.products}
            logs={app.logs}
            onOpen={() => router.push('/today')}
            onToggle={(productId, day, taken) => void app.toggleTaken(productId, day, taken)}
            onAllTaken={(day) => void app.markAllTaken(day)}
          />
        ) : null}
        {showOffer ? (
          <ReminderOffer
            onContinue={() => {
              void (async () => {
                await requestReminderAccess();
                const stored = app.dailyReminderTime;
                const time = stored && isValidTime(stored) ? stored : nowTime();
                await app.setDailyReminder(true, time);
              })();
            }}
            onDismiss={() => void app.dismissReminderOffer()}
          />
        ) : null}
        <Card>
          <T size={13} color={theme.muted}>
            Estimated monthly spend
          </T>
          <T weight="bold" size={44} style={styles.spend}>
            {joinMoney(audit.money.map((line) => ({ currency: line.currency, cents: line.monthlyCents }))) ?? formatMoney(0, app.currency)}
          </T>
          {audit.duplicates.length > 0 ? (
            <View style={styles.overlapRow}>
              <Pill>{`${audit.duplicates.length} overlaps`}</Pill>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/audit')} style={styles.link}>
                <T size={14} weight="semibold" color={theme.teal}>
                  View in Audit
                </T>
              </Pressable>
            </View>
          ) : null}
          {app.products.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/audit')} style={styles.scoreRow}>
              <ScoreBadge score={scored.score} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <T weight="semibold">Dose audit</T>
                <T size={13} color={theme.muted}>
                  {scored.summary}
                </T>
              </View>
            </Pressable>
          ) : null}
        </Card>
        {app.products.length === 0 ? (
          <Card>
            <T weight="semibold" size={18}>
              Nothing in your stack yet
            </T>
            <T size={14} color={theme.muted}>
              Search the NIH label database, scan a barcode, or add one by hand. The bar below is the way to add one.
            </T>
          </Card>
        ) : (
          <View style={styles.group}>
            {app.products.map((product, index) => (
              <ProductRow
                key={product.id}
                product={product}
                last={index === app.products.length - 1}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.addBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ADD_SUPPLEMENT_LABEL}
            onPress={openAdd}
            style={({ pressed }) => [styles.addMain, pressed ? { opacity: 0.88 } : null]}
          >
            <T weight="semibold" size={16} color="#FFFFFF">
              {ADD_SUPPLEMENT_LABEL}
            </T>
          </Pressable>
          <View style={styles.addSplit} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a barcode"
            onPress={() => router.push('/scan')}
            style={({ pressed }) => [styles.addScan, pressed ? { opacity: 0.88 } : null]}
          >
            <Ionicons name="barcode-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function localStyles(theme: Theme) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingBottom: 8, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { letterSpacing: -0.8, flex: 1 },
  group: { backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  links: { flexDirection: 'row', gap: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl, gap: 14 },
  spend: { letterSpacing: -1.5, lineHeight: 50 },
  overlapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 12,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },
  addBar: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: theme.action,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  addMain: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  addSplit: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 12 },
  addScan: { width: 52, alignItems: 'center', justifyContent: 'center' },
});
}

