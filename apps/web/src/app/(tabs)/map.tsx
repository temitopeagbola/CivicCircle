import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SEVERITIES, SEVERITY_LABELS, type GeoPoint } from '@civiccircle/shared';

import { ReportsMap } from '@/components/map/ReportsMap';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { errorMessage } from '@/lib/api';
import { config } from '@/lib/config';
import { currentLocation } from '@/lib/location';
import { useNearby } from '@/lib/queries';
import { colors, radius, severityStyle, space } from '@/theme';

export default function MapScreen() {
  const [focus, setFocus] = useState<GeoPoint>(config.defaultCenter);
  const [area, setArea] = useState({ center: config.defaultCenter, radiusKm: 2 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const nearby = useNearby(area.center, area.radiusKm);
  const markers = nearby.data?.items ?? [];
  const selected = markers.find((m) => m.id === selectedId) ?? null;

  // Debounce map movement so panning doesn't fire a request per frame.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMoveEnd = useCallback((center: GeoPoint, radiusKm: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArea({ center, radiusKm }), 400);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const nearMe = async () => {
    setLocating(true);
    setLocationError(null);
    const here = await currentLocation();
    setLocating(false);
    if (here) {
      setFocus(here);
      setArea((a) => ({ ...a, center: here }));
    } else {
      setLocationError('Location is unavailable, so the map stays on the demo area.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <ReportsMap
          markers={markers}
          center={focus}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMoveEnd={onMoveEnd}
        />
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.pill}>
            {nearby.isFetching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text variant="caption" style={{ fontWeight: '600' }}>
              {markers.length} {markers.length === 1 ? 'report' : 'reports'} in view
            </Text>
          </View>
          <Pressable
            onPress={nearMe}
            accessibilityRole="button"
            accessibilityLabel="Centre the map on my location"
            style={styles.pill}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="locate" size={16} color={colors.primaryDark} />
            )}
            <Text variant="caption" style={{ fontWeight: '600', color: colors.primaryDark }}>
              Near me
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sheet}>
        {nearby.isError ? <InlineError message={errorMessage(nearby.error)} /> : null}
        {locationError ? <InlineError message={locationError} /> : null}
        <View style={styles.legend} accessibilityLabel="Marker colours show severity">
          {SEVERITIES.map((s) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: severityStyle[s].marker }]} />
              <Text variant="caption" muted>
                {SEVERITY_LABELS[s]}
              </Text>
            </View>
          ))}
        </View>

        {selected ? (
          <View style={styles.preview} testID="map-preview">
            <Text variant="heading" numberOfLines={2}>
              {selected.summary}
            </Text>
            <View style={styles.row}>
              <StatusBadge status={selected.status} />
              <SeverityBadge severity={selected.severity} />
              <Text variant="caption" muted>
                ▲ {selected.upvoteCount}
              </Text>
            </View>
            <Button
              label="Open report"
              icon="arrow-forward"
              onPress={() => router.push(`/report/${selected.id}`)}
            />
          </View>
        ) : (
          <Text muted>Tap a marker to preview a report, or browse the list.</Text>
        )}

        <Button
          label={showList ? 'Hide list' : `List reports in view (${markers.length})`}
          variant="ghost"
          icon={showList ? 'chevron-down' : 'list'}
          onPress={() => setShowList((v) => !v)}
        />
        {showList ? (
          <ScrollView style={{ maxHeight: 220 }} accessibilityRole="list">
            {markers.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="link"
                onPress={() => router.push(`/report/${m.id}`)}
                style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.dot, { backgroundColor: severityStyle[m.severity].marker }]} />
                <Text numberOfLines={1} style={{ flex: 1 }}>
                  {m.summary}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1, minHeight: 280 },
  topBar: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheet: {
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legend: { flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  preview: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
  },
});
