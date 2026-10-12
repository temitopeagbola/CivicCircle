import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ReportDTO } from '@civiccircle/shared';

import { timeAgo } from '@/lib/format';
import { categoryIcon, colors, radius, space } from '@/theme';

import { CategoryBadge, SeverityBadge, StatusBadge } from './ui/Badge';
import { Text } from './ui/Text';
import { UpvoteButton } from './UpvoteButton';

export function ReportCard({ report }: { report: ReportDTO }) {
  return (
    <View style={styles.card} testID="report-card">
      <Link href={`/report/${report.id}`} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${report.summary}. ${report.status}. ${report.address ?? ''}`}
          style={styles.main}
        >
          {report.photoUrl ? (
            <Image
              source={{ uri: report.photoUrl }}
              style={styles.photo}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
              alt=""
            />
          ) : (
            <View style={[styles.photo, styles.placeholder]}>
              <Ionicons name={categoryIcon[report.category]} size={28} color={colors.textSubtle} />
            </View>
          )}
          <View style={styles.body}>
            <Text variant="heading" numberOfLines={2}>
              {report.summary}
            </Text>
            <View style={styles.badges}>
              <StatusBadge status={report.status} />
              <SeverityBadge severity={report.severity} />
              <CategoryBadge category={report.category} />
            </View>
            <Text variant="caption" muted numberOfLines={1}>
              {[report.address, timeAgo(report.createdAt), report.author.displayName]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </Pressable>
      </Link>
      <View style={styles.footer}>
        <UpvoteButton report={report} />
        <View style={styles.meta} accessible accessibilityLabel={`${report.commentCount} comments`}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
          <Text variant="caption" muted>
            {report.commentCount}
          </Text>
        </View>
        {report.duplicates.length > 0 && report.status !== 'duplicate' ? (
          <View style={styles.meta}>
            <Ionicons name="copy-outline" size={16} color={colors.warningText} />
            <Text variant="caption" style={{ color: colors.warningText }}>
              Possible duplicate
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: { flexDirection: 'row', gap: space.md, padding: space.md },
  photo: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: space.sm, minWidth: 0 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
