'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  formatCoordinate,
  KERMANSHAH_DEFAULT,
  parseLatLng,
} from '@/lib/coordinates';
import { createMapIrRasterLayer } from '@/lib/mapir-tile-layer';

const markerIcon = L.divIcon({
  className: 'heritage-map-marker',
  html: '<div class="h-5 w-5 rounded-full border-[3px] border-sand-100 bg-teal-700 shadow-[0_2px_8px_rgba(42,29,20,0.28)]"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

type LocationMapPickerProps = {
  lat: string;
  lng: string;
  onLatLngChange: (lat: string, lng: string) => void;
  apiKey: string | undefined;
  labels: {
    map: string;
    hint: string;
    missingKey: string;
  };
};

function MapIrTiles() {
  const map = useMap();

  useEffect(() => {
    const layer = createMapIrRasterLayer();
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapViewSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, map]);

  return null;
}

function MapPickerInner({
  lat,
  lng,
  onLatLngChange,
}: {
  lat: string;
  lng: string;
  onLatLngChange: (lat: string, lng: string) => void;
}) {
  const position = parseLatLng(lat, lng);
  const center = position ?? KERMANSHAH_DEFAULT;

  function applyPick(latNum: number, lngNum: number) {
    onLatLngChange(formatCoordinate(latNum), formatCoordinate(lngNum));
  }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={KERMANSHAH_DEFAULT.zoom}
      className="h-full w-full rounded-[inherit]"
      scrollWheelZoom
    >
      <MapIrTiles />
      <MapClickHandler onPick={applyPick} />
      {position ? (
        <>
          <MapViewSync lat={position.lat} lng={position.lng} />
          <Marker
            icon={markerIcon}
            position={[position.lat, position.lng]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat: newLat, lng: newLng } = event.target.getLatLng();
                applyPick(newLat, newLng);
              },
            }}
          />
        </>
      ) : null}
    </MapContainer>
  );
}

export function LocationMapPicker({
  lat,
  lng,
  onLatLngChange,
  apiKey,
  labels,
}: LocationMapPickerProps) {
  if (!apiKey?.trim()) {
    return (
      <div className="rounded-card border border-brown-800/15 bg-white px-4 py-3 text-[15px] text-brown-600">
        {labels.missingKey}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-bold tracking-wide text-brown-800">{labels.map}</span>
      <div className="relative z-0 isolate aspect-video min-h-[14rem] overflow-hidden rounded-card border border-brown-800/10 ring-1 ring-brown-800/8">
        <MapPickerInner lat={lat} lng={lng} onLatLngChange={onLatLngChange} />
      </div>
      <p className="text-xs text-brown-600">{labels.hint}</p>
    </div>
  );
}
