import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/lib/api';
import { colors, radius, space } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text muted>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  action,
}: {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text variant="heading" style={styles.centerText}>
        {title}
      </Text>
      {message ? (
        <Text muted style={styles.centerText}>
          {message}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.center} role="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <Text variant="heading" style={styles.centerText}>
        Couldn’t load this
      </Text>
      <Text muted style={styles.centerText}>
        {errorMessage(error)}
      </Text>
      {onRetry ? <Button label="Try again" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.inline} role="alert">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text variant="caption" style={{ color: colors.danger, flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  centerText: { textAlign: 'center', maxWidth: 420 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
});
