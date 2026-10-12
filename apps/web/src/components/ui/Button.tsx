import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, space } from '@/theme';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'md',
  style,
  ...props
}: ButtonProps) {
  const palette = PALETTE[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.large,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { backgroundColor: palette.pressed },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={palette.fg} />
      ) : null}
      <Text variant="label" style={{ color: palette.fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

const PALETTE: Record<Variant, { bg: string; fg: string; border: string; pressed: string }> = {
  primary: {
    bg: colors.primary,
    fg: colors.onPrimary,
    border: colors.primary,
    pressed: colors.primaryDark,
  },
  secondary: {
    bg: colors.surface,
    fg: colors.primaryDark,
    border: colors.border,
    pressed: colors.surfaceMuted,
  },
  ghost: {
    bg: 'transparent',
    fg: colors.primaryDark,
    border: 'transparent',
    pressed: colors.surfaceMuted,
  },
  danger: { bg: colors.surface, fg: colors.danger, border: '#FECACA', pressed: colors.dangerSoft },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  large: { minHeight: 52, paddingHorizontal: space.xl },
  disabled: { opacity: 0.55 },
});
