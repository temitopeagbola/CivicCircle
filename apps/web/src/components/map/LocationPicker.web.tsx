import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { colors } from '@/theme';

import { TILE_ATTRIBUTION, TILE_URL, type LocationPickerProps } from './types';

// An HTML pin avoids Leaflet's default marker images, which bundlers can't resolve.
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${colors.primary};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function ClickToMove({ onChange }: Pick<LocationPickerProps, 'onChange'>) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Follow({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const handlers = useMemo(
    () => ({
      dragend: (e: L.DragEndEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      },
    }),
    [onChange],
  );
  return (
    <MapContainer
      center={[value.lat, value.lng]}
      zoom={16}
      style={{ height: '100%', width: '100%', borderRadius: 12 }}
      aria-label="Choose the location: click the map or drag the pin"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickToMove onChange={onChange} />
      <Follow lat={value.lat} lng={value.lng} />
      <Marker
        position={[value.lat, value.lng]}
        draggable
        icon={pinIcon}
        eventHandlers={handlers}
        keyboard
        title="Report location"
      />
    </MapContainer>
  );
}
