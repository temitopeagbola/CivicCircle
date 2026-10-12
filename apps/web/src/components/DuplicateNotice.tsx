import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { STATUS_LABELS, type DuplicateMatch } from '@civiccircle/shared';

import { formatDistance, formatPercent } from '@/lib/format';
import { colors, radius, space } from '@/theme';

import { Text } from './ui/Text';

export function DuplicateNotice({
  duplicates,
  title = 'Possible duplicates nearby',
}: {
  duplicates: DuplicateMatch[];
  title?: string;
}) {
  if (duplicates.length === 0) return null;
  return (
    <View style={styles.box} testID="duplicate-notice">
      <View style={styles.header}>
        <Ionicons name="copy" size={18} color={colors.warningText} />
        <Text variant="label" style={{ color: colors.warningText }}>
          {title}
        </Text>
      </View>
      <Text variant="caption" style={{ color: colors.warningText }}>
        AI compared the wording, distance and category with recent reports close by. If one of these
        is the same problem, upvoting it helps more than a new report.
      </Text>
      {duplicates.map((d) => (
        <Link key={d.id} href={`/report/${d.id}`} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${d.summary}, ${formatPercent(d.score)} match, ${formatDistance(d.distanceM)} away`}
            style={styles.match}
          >
            <View style={{ flex: 1 }}>
              <Text variant="label" numberOfLines={2}>
                {d.summary}
              </Text>
              <Text variant="caption" muted>
                {formatPercent(d.score)} match · {formatDistance(d.distanceM)} away ·{' '}
                {STATUS_LABELS[d.status]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
});
