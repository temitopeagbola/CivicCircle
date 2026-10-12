import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { ReportDTO } from '@civiccircle/shared';

import { useToggleUpvote } from '@/lib/queries';
import { colors, radius, space } from '@/theme';

import { Text } from './ui/Text';

export function UpvoteButton({ report, large }: { report: ReportDTO; large?: boolean }) {
  const toggle = useToggleUpvote();
  const active = report.viewerHasUpvoted;
  const label = large ? (active ? 'You’ve seen this too' : 'I’ve seen this too') : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      aria-pressed={active}
      accessibilityLabel={`${active ? 'Remove upvote' : 'Upvote'}: ${report.upvoteCount} upvotes`}
      onPress={() => toggle.mutate(report)}
      disabled={toggle.isPending}
      hitSlop={6}
      testID={large ? 'upvote-button-large' : 'upvote-button'}
      style={({ pressed }) => [
        styles.button,
        large && styles.large,
        active && styles.active,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons
        name={active ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
        size={large ? 22 : 18}
        color={active ? colors.onPrimary : colors.primaryDark}
      />
      {label ? (
        <Text variant="label" style={{ color: active ? colors.onPrimary : colors.primaryDark }}>
          {label}
        </Text>
      ) : null}
      <Text
        variant="label"
        style={{ color: active ? colors.onPrimary : colors.primaryDark }}
        testID="upvote-count"
      >
        {report.upvoteCount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: '#F0FDFA',
  },
  large: { minHeight: 48, paddingHorizontal: space.lg },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
});
