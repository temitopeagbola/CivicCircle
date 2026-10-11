import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_LABELS, SEVERITY_LABELS } from '@civiccircle/shared';

import { Comments } from '@/components/Comments';
import { DuplicateNotice } from '@/components/DuplicateNotice';
import { ReportsMap } from '@/components/map/ReportsMap';
import { ModeratorPanel } from '@/components/ModeratorPanel';
import { StatusTimeline } from '@/components/StatusTimeline';
import { CategoryBadge, SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Card, ScrollScreen } from '@/components/ui/Layout';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { UpvoteButton } from '@/components/UpvoteButton';
import { useAuth } from '@/lib/auth';
import { formatPercent, timeAgo } from '@/lib/format';
import { useReport } from '@/lib/queries';
import { colors, radius, space } from '@/theme';

export default function ReportScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { status, isModerator } = useAuth();
  const query = useReport(id);

  if (status === 'signedOut') return <Redirect href="/welcome" />;
  if (query.isPending) return <LoadingState label="Loading report…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const report = query.data;
  const justCreated = created === '1';
  const ai = report.ai;

  return (
    <ScrollScreen>
      <Stack.Screen
        options={{
          title: report.summary,
          // Deep links have no history to go back to, so offer a way home.
          headerLeft: router.canGoBack() ? undefined : () => <HomeButton />,
        }}
      />

      {justCreated ? (
        <View style={styles.success} role="status" testID="created-banner">
          <Ionicons name="checkmark-circle" size={22} color="#166534" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" style={{ color: '#166534' }}>
              Report submitted
            </Text>
            <Text variant="caption" style={{ color: '#166534' }}>
              AI filed it under {CATEGORY_LABELS[report.category]} with{' '}
              {SEVERITY_LABELS[report.severity].toLowerCase()} severity.
              {report.duplicates.length
                ? ' It also looks similar to reports nearby. Check them below.'
                : ' No similar reports nearby.'}
            </Text>
          </View>
        </View>
      ) : null}

      {report.duplicateOf ? (
        <Link href={`/report/${report.duplicateOf}`} style={styles.duplicateOf}>
          <Text variant="label">
            A moderator marked this as a duplicate. View the original report →
          </Text>
        </Link>
      ) : null}

      {report.photoUrl ? (
        <Image
          source={{ uri: report.photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          alt={`Photo: ${report.summary}`}
          accessibilityLabel={`Photo: ${report.summary}`}
        />
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text variant="title" testID="report-summary">
          {report.summary}
        </Text>
        <View style={styles.badges}>
          <StatusBadge status={report.status} />
          <SeverityBadge severity={report.severity} />
          <CategoryBadge category={report.category} />
        </View>
        <View style={styles.aiLine} testID="ai-provenance">
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text variant="caption" muted style={{ flex: 1 }}>
            Category, severity and summary by AI (
            {ai.provider === 'openai' ? ai.model : 'offline heuristics'},{' '}
            {formatPercent(ai.confidence)} confident)
            {ai.fallbackReason ? `. Fallback used: ${ai.fallbackReason.toLowerCase()}.` : '.'}
          </Text>
        </View>
      </View>

      <UpvoteButton report={report} large />

      <Card>
        <Text>{report.description}</Text>
        <Text variant="caption" muted>
          Reported by {report.author.displayName} · {timeAgo(report.createdAt)}
          {report.address ? ` · ${report.address}` : ''}
        </Text>
        <View style={styles.map}>
          <ReportsMap
            markers={[
              {
                id: report.id,
                location: report.location,
                category: report.category,
                severity: report.severity,
                status: report.status,
                summary: report.summary,
                upvoteCount: report.upvoteCount,
              },
            ]}
            center={report.location}
            selectedId={report.id}
            onSelect={() => undefined}
          />
        </View>
      </Card>

      {report.status !== 'duplicate' ? (
        <DuplicateNotice
          duplicates={report.duplicates}
          title={justCreated ? 'Is this the same as one of these?' : 'Possible duplicates nearby'}
        />
      ) : null}

      {isModerator ? <ModeratorPanel report={report} /> : null}

      <Card>
        <Text variant="heading">Status history</Text>
        <StatusTimeline history={report.statusHistory} />
      </Card>

      <Card>
        <Text variant="heading">Comments ({report.commentCount})</Text>
        <Comments reportId={report.id} />
      </Card>
    </ScrollScreen>
  );
}

function HomeButton() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Back to all reports"
      onPress={() => router.replace('/')}
      style={styles.home}
    >
      <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
      <Text variant="label" style={{ color: colors.primaryDark }}>
        Reports
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  home: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, minHeight: 44 },
  success: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  duplicateOf: {
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  aiLine: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  map: { height: 180, borderRadius: radius.md, overflow: 'hidden' },
});
