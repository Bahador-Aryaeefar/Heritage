import type { Locale } from '@/i18n/routing';
import { getLocaleDefinition } from '@/i18n/locales';

function normalizeCoordinate(value: string): string {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid coordinate: ${value}`);
  }
  return parsed.toFixed(7);
}

export function buildGoogleMapsUrl(lat: string, lng: string): string {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLng = normalizeCoordinate(lng);
  return `https://www.google.com/maps?q=${normalizedLat},${normalizedLng}`;
}

export function buildNeshanMapsUrl(lat: string, lng: string): string {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLng = normalizeCoordinate(lng);
  return `https://nshn.ir/?lat=${normalizedLat}&lng=${normalizedLng}`;
}

export function buildGoogleMapsEmbedUrl(lat: string, lng: string): string {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLng = normalizeCoordinate(lng);
  return `https://www.google.com/maps?q=${normalizedLat},${normalizedLng}&z=16&output=embed`;
}

export function formatCoordinates(lat: string, lng: string, locale: Locale): string {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLng = normalizeCoordinate(lng);
  const numberLocale = getLocaleDefinition(locale).numberLocale;

  const formattedLat = Number.parseFloat(normalizedLat).toLocaleString(numberLocale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 7,
  });
  const formattedLng = Number.parseFloat(normalizedLng).toLocaleString(numberLocale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 7,
  });

  return `${formattedLat}, ${formattedLng}`;
}
