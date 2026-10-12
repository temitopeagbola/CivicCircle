import { useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';

import { severityStyle } from '@/theme';

import type { ReportsMapProps } from './types';

const DELTA = 0.02;

/** Native map (Apple Maps on iOS, Google Maps on Android). The web build uses Leaflet. */
export function ReportsMap({ markers, center, selectedId, onSelect, onMoveEnd }: ReportsMapProps) {
  const ref = useRef<MapView>(null);

  useEffect(() => {
    ref.current?.animateToRegion({
      latitude: center.lat,
      longitude: center.lng,
      latitudeDelta: DELTA,
      longitudeDelta: DELTA,
    });
  }, [center.lat, center.lng]);

  return (
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA,
      }}
      showsUserLocation
      onRegionChangeComplete={(region) =>
        onMoveEnd?.(
          { lat: region.latitude, lng: region.longitude },
          Math.min(25, Math.max(0.5, (region.latitudeDelta * 111) / 2)),
        )
      }
      accessibilityLabel="Map of reported issues"
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.location.lat, longitude: m.location.lng }}
          pinColor={severityStyle[m.severity].marker}
          opacity={m.status === 'resolved' ? 0.5 : 1}
          title={m.summary}
          onPress={() => onSelect(m.id)}
          zIndex={m.id === selectedId ? 10 : 1}
        />
      ))}
    </MapView>
  );
}
