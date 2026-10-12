import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type Category,
  type ReportStatus,
  type Severity,
} from '@civiccircle/shared';

import { categoryIcon, colors, radius, severityStyle, space, statusStyle } from '@/theme';

import { Text } from './Text';

interface BadgeProps {
  label: string;
  fg: string;
  bg: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel?: string;
}

export function Badge({ label, fg, bg, icon, accessibilityLabel }: BadgeProps) {
  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text variant="caption" style={[styles.badgeText, { color: fg }]}>
        {label}
      </Text>
    </View>
  );
}

export const CategoryBadge = ({ category }: { category: Category }) => (
  <Badge
    label={CATEGORY_LABELS[category]}
    fg={colors.text}
    bg={colors.surfaceMuted}
    icon={categoryIcon[category]}
    accessibilityLabel={`Category: ${CATEGORY_LABELS[category]}`}
  />
);

export const SeverityBadge = ({ severity }: { severity: Severity }) => (
  <Badge
    label={SEVERITY_LABELS[severity]}
    fg={severityStyle[severity].fg}
    bg={severityStyle[severity].bg}
    icon="alert-circle"
    accessibilityLabel={`Severity: ${SEVERITY_LABELS[severity]}`}
  />
);

export const StatusBadge = ({ status }: { status: ReportStatus }) => (
  <Badge
    label={STATUS_LABELS[status]}
    fg={statusStyle[status].fg}
    bg={statusStyle[status].bg}
    icon={statusStyle[status].icon}
    accessibilityLabel={`Status: ${STATUS_LABELS[status]}`}
  />
);

/** Selectable filter chip. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.onPrimary : colors.textMuted} />
      ) : null}
      <Text
        variant="caption"
        style={[styles.chipText, selected && { color: colors.onPrimary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: colors.textMuted },
});
