import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';

import { severityStyle } from '@/theme';

import { TILE_ATTRIBUTION, TILE_URL, type ReportsMapProps } from './types';

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function MoveListener({ onMoveEnd }: Pick<ReportsMapProps, 'onMoveEnd'>) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      const radiusKm = map.distance(c, map.getBounds().getNorthEast()) / 1000;
      onMoveEnd?.({ lat: c.lat, lng: c.lng }, Math.min(25, Math.max(0.5, radiusKm)));
    },
  });
  return null;
}

export function ReportsMap({ markers, center, selectedId, onSelect, onMoveEnd }: ReportsMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      aria-label="Map of reported issues"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ZoomControl position="bottomright" />
      <Recenter lat={center.lat} lng={center.lng} />
      <MoveListener onMoveEnd={onMoveEnd} />
      {markers.map((m) => {
        const selected = m.id === selectedId;
        return (
          <CircleMarker
            key={m.id}
            center={[m.location.lat, m.location.lng]}
            radius={selected ? 12 : 9}
            pathOptions={{
              color: selected ? '#0F172A' : '#FFFFFF',
              weight: selected ? 3 : 2,
              fillColor: severityStyle[m.severity].marker,
              fillOpacity: m.status === 'resolved' ? 0.45 : 0.95,
            }}
            eventHandlers={{ click: () => onSelect(m.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {m.summary}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
