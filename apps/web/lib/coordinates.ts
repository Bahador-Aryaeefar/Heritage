/** Parse a coordinate string; returns null if invalid. */
export function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Format for API storage (matches public map-url normalization precision). */
export function formatCoordinate(value: number): string {
  return value.toFixed(7);
}

export function parseLatLng(
  lat: string,
  lng: string,
): { lat: number; lng: number } | null {
  const latNum = parseCoordinate(lat);
  const lngNum = parseCoordinate(lng);
  if (latNum === null || lngNum === null) return null;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
  return { lat: latNum, lng: lngNum };
}

export const KERMANSHAH_DEFAULT = { lat: 34.3142, lng: 47.065, zoom: 12 } as const;
