import type { GeoPoint, MapMarkerDTO } from '@civiccircle/shared';

export interface ReportsMapProps {
  markers: MapMarkerDTO[];
  /** Where the map is centred; changing it re-centres the map. */
  center: GeoPoint;
  selectedId?: string | null;
  onSelect(id: string): void;
  /** Fired after the user pans/zooms, with the visible centre and an approximate radius. */
  onMoveEnd?(center: GeoPoint, radiusKm: number): void;
}

export interface LocationPickerProps {
  value: GeoPoint;
  onChange(point: GeoPoint): void;
}

/** OpenStreetMap's standard tiles: free, keyless, attribution required (light use only). */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
