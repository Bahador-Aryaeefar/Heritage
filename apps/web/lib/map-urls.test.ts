import { describe, expect, it } from 'vitest';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  buildNeshanMapsUrl,
  formatCoordinates,
} from '@/lib/map-urls';

describe('map-urls', () => {
  it('builds Google Maps open URL from lat/lng', () => {
    expect(buildGoogleMapsUrl('34.3872000', '47.1332000')).toBe(
      'https://www.google.com/maps?q=34.3872000,47.1332000',
    );
  });

  it('builds Neshan Maps open URL from lat/lng', () => {
    expect(buildNeshanMapsUrl('34.3872000', '47.1332000')).toBe(
      'https://nshn.ir/?lat=34.3872000&lng=47.1332000',
    );
  });

  it('builds Google Maps embed URL from lat/lng', () => {
    expect(buildGoogleMapsEmbedUrl('34.3872000', '47.1332000')).toBe(
      'https://www.google.com/maps?q=34.3872000,47.1332000&z=16&output=embed',
    );
  });

  it('formats coordinates with Persian digits for fa locale', () => {
    const formatted = formatCoordinates('34.3872000', '47.1332000', 'fa');
    expect(formatted).toMatch(/[\u06F0-\u06F9]/);
    expect(formatted).toContain(',');
  });

  it('formats coordinates with Latin digits for en locale', () => {
    expect(formatCoordinates('34.3872000', '47.1332000', 'en')).toBe('34.3872, 47.1332');
  });

  it('formats coordinates for ar locale', () => {
    const formatted = formatCoordinates('34.3872000', '47.1332000', 'ar');
    expect(formatted).toContain(',');
  });
});
