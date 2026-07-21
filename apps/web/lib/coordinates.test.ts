import { describe, expect, it } from 'vitest';
import { formatCoordinate, parseCoordinate, parseLatLng } from './coordinates';

describe('coordinates', () => {
  it('parses and formats with 7 decimal places', () => {
    expect(parseCoordinate('34.3142')).toBeCloseTo(34.3142);
    expect(formatCoordinate(47.065)).toBe('47.0650000');
  });

  it('parseLatLng rejects out-of-range values', () => {
    expect(parseLatLng('91', '0')).toBeNull();
    expect(parseLatLng('34', '181')).toBeNull();
    expect(parseLatLng('34.1', '47.2')).toEqual({ lat: 34.1, lng: 47.2 });
  });
});
