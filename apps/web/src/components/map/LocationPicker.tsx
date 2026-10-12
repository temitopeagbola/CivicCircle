import { useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';

import { colors } from '@/theme';

import type { LocationPickerProps } from './types';

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const ref = useRef<MapView>(null);

  useEffect(() => {
    ref.current?.animateCamera({ center: { latitude: value.lat, longitude: value.lng } });
  }, [value.lat, value.lng]);

  return (
    <MapView
      ref={ref}
      style={{ flex: 1, borderRadius: 12 }}
      initialRegion={{
        latitude: value.lat,
        longitude: value.lng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      }}
      onPress={(e) =>
        onChange({
          lat: e.nativeEvent.coordinate.latitude,
          lng: e.nativeEvent.coordinate.longitude,
        })
      }
      accessibilityLabel="Choose the location: tap the map or drag the pin"
    >
      <Marker
        coordinate={{ latitude: value.lat, longitude: value.lng }}
        draggable
        pinColor={colors.primary}
        onDragEnd={(e) =>
          onChange({
            lat: e.nativeEvent.coordinate.latitude,
            lng: e.nativeEvent.coordinate.longitude,
          })
        }
      />
    </MapView>
  );
}
