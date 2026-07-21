import L from 'leaflet';

/**
 * Same-origin proxy — Map.ir requires `x-api-key` as a request header,
 * which Leaflet image tiles cannot set. See `/api/mapir-tiles/...`.
 */
const PROXY_TILE_URL = '/api/mapir-tiles/{z}/{x}/{y}';

export function createMapIrRasterLayer(): L.TileLayer {
  return L.tileLayer(PROXY_TILE_URL, {
    maxZoom: 20,
    attribution: '&copy; <a href="https://map.ir" target="_blank" rel="noreferrer">Map.ir</a>',
  });
}
