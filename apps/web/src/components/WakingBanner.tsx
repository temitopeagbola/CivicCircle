import { useSyncExternalStore } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiStatus } from '@/lib/apiStatus';
import { colors, space } from '@/theme';

import { Text } from './ui/Text';

/**
 * Shown while the first API request of the session is slow — usually Render's free tier
 * waking the server up. Announced politely to screen readers.
 */
export function WakingBanner() {
  const { waking } = useSyncExternalStore(apiStatus.subscribe, apiStatus.getState);
  const insets = useSafeAreaInsets();
  if (!waking) return null;
  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + space.sm }]}
      role="status"
      aria-live="polite"
      accessibilityLiveRegion="polite"
      testID="waking-banner"
    >
      <ActivityIndicator color={colors.warningText} size="small" />
      <View style={{ flex: 1 }}>
        <Text variant="label" style={{ color: colors.warningText }}>
          Waking the server…
        </Text>
        <Text variant="caption" style={{ color: colors.warningText }}>
          The demo API runs on a free tier that sleeps when idle. The first request can take up to a
          minute; after that it’s quick.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
});
