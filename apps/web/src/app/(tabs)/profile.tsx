import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { STATUS_LABELS } from '@civiccircle/shared';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, ScrollScreen } from '@/components/ui/Layout';
import { InlineError } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { formatUsd, initials, timeAgo } from '@/lib/format';
import { useAiUsage, useReports } from '@/lib/queries';
import { colors, radius, space, statusStyle } from '@/theme';

export default function ProfileScreen() {
  const { me, user, isModerator, signOut } = useAuth();
  const mine = useReports({ mine: true, sort: 'new' });
  const usage = useAiUsage(isModerator);
  const myReports = mine.data?.pages.flatMap((p) => p.items) ?? [];
  const name = me?.displayName ?? user?.displayName ?? 'You';

  return (
    <ScrollScreen>
      <Card style={styles.identity}>
        <View style={styles.avatar}>
          <Text variant="title" style={{ color: colors.onPrimary }}>
            {initials(name)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="title">{name}</Text>
          <View style={styles.row}>
            {isModerator ? (
              <Badge label="Moderator" fg="#5B21B6" bg="#EDE9FE" icon="shield-checkmark" />
            ) : (
              <Badge label="Resident" fg={colors.primaryDark} bg={colors.primarySoft} icon="home" />
            )}
            {me?.isDemo ? (
              <Badge label="Shared demo account" fg={colors.warningText} bg={colors.warningSoft} />
            ) : null}
          </View>
          {me?.email ? (
            <Text variant="caption" muted>
              {me.email}
            </Text>
          ) : null}
        </View>
      </Card>

      {isModerator ? (
        <Card testID="ai-usage">
          <Text variant="heading">AI budget this month</Text>
          {usage.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : usage.isError ? (
            <InlineError message={errorMessage(usage.error)} />
          ) : (
            <>
              <View
                style={styles.meter}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: usage.data.budgetUsd,
                  now: usage.data.spentUsd,
                }}
              >
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${Math.min(100, (usage.data.spentUsd / Math.max(usage.data.budgetUsd, 0.0001)) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text>
                {formatUsd(usage.data.spentUsd)} of {formatUsd(usage.data.budgetUsd)} ·{' '}
                {usage.data.calls} paid calls
              </Text>
              <Text variant="caption" muted>
                Provider:{' '}
                {usage.data.provider === 'openai'
                  ? `OpenAI (${usage.data.model})`
                  : 'offline heuristics (no API key set)'}
                . When the cap is reached, new reports fall back to heuristics until next month.
              </Text>
            </>
          )}
        </Card>
      ) : null}

      <Card>
        <Text variant="heading">My reports</Text>
        {mine.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : mine.isError ? (
          <InlineError message={errorMessage(mine.error)} />
        ) : myReports.length === 0 ? (
          <Text muted>You haven’t reported anything yet.</Text>
        ) : (
          <View accessibilityRole="list">
            {myReports.map((r) => (
              <Link key={r.id} href={`/report/${r.id}`} asChild>
                <Pressable accessibilityRole="link" style={styles.reportRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" numberOfLines={1}>
                      {r.summary}
                    </Text>
                    <Text variant="caption" muted>
                      {timeAgo(r.createdAt)} · ▲ {r.upvoteCount} · {r.commentCount} comments
                    </Text>
                  </View>
                  <Badge
                    label={STATUS_LABELS[r.status]}
                    fg={statusStyle[r.status].fg}
                    bg={statusStyle[r.status].bg}
                  />
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </Card>

      <Button label="Sign out" icon="log-out-outline" variant="danger" onPress={() => signOut()} />
      <Text variant="caption" muted style={{ textAlign: 'center' }}>
        API: {config.apiUrl}
      </Text>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  meter: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: colors.primary },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
