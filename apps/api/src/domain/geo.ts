import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common';

import type { GeoPoint } from '@civiccircle/shared';

export function geohashFor(point: GeoPoint): string {
  return geohashForLocation([point.lat, point.lng]);
}

/** Great-circle distance in metres. */
export function distanceM(a: GeoPoint, b: GeoPoint): number {
  return distanceBetween([a.lat, a.lng], [b.lat, b.lng]) * 1000;
}

/** Geohash ranges that together cover a circle; query each and filter by `distanceM`. */
export function geohashBounds(center: GeoPoint, radiusM: number): [string, string][] {
  return geohashQueryBounds([center.lat, center.lng], radiusM).map(([start, end]) => [start, end]);
}
