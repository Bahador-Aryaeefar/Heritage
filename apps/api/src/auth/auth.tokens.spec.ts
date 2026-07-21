import { hashRefreshToken, generateOpaqueToken } from './auth.tokens';

describe('auth.tokens', () => {
  it('hashes refresh tokens deterministically', () => {
    expect(hashRefreshToken('abc')).toBe(hashRefreshToken('abc'));
    expect(hashRefreshToken('abc')).not.toBe(hashRefreshToken('def'));
  });

  it('generates opaque tokens', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });
});
