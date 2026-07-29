import { parseDeviceType } from './device-type';

describe('parseDeviceType', () => {
  it('returns undefined when no user agent is given', () => {
    expect(parseDeviceType(undefined)).toBeUndefined();
  });

  it('detects mobile', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
  });

  it('detects tablet', () => {
    expect(parseDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
  });

  it('falls back to desktop', () => {
    expect(parseDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });
});
