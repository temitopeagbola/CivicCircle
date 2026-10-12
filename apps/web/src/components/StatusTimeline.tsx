import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { STATUS_LABELS, type StatusChange } from '@civiccircle/shared';

import { timeAgo } from '@/lib/format';
import { colors, space, statusStyle } from '@/theme';

import { Text } from './ui/Text';

export function StatusTimeline({ history }: { history: StatusChange[] }) {
  const items = [...history].reverse();
  return (
    <View accessibilityRole="list" style={styles.list}>
      {items.map((change, i) => (
        <View key={`${change.at}-${i}`} accessibilityRole={'listitem' as never} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: statusStyle[change.status].bg }]}>
              <Ionicons
                name={statusStyle[change.status].icon}
                size={14}
                color={statusStyle[change.status].fg}
              />
            </View>
            {i < items.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <Text variant="label">{STATUS_LABELS[change.status]}</Text>
            {change.note ? <Text>{change.note}</Text> : null}
            <Text variant="caption" muted>
              {change.by.displayName} · {timeAgo(change.at)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 28 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  content: { flex: 1, paddingBottom: space.lg, gap: 2 },
});
