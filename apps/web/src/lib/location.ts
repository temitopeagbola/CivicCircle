import * as Location from 'expo-location';

import type { GeoPoint } from '@civiccircle/shared';

/** Current position, or null if permission is denied or the lookup fails. */
export async function currentLocation(): Promise<GeoPoint | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}
