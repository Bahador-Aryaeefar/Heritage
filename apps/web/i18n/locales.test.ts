import { describe, expect, it } from 'vitest';
import {
  CONTENT_LOCALE_DEFINITIONS,
  LOCALE_DEFINITIONS,
  getDir,
  localePathPrefix,
  localizedPath,
  toContentLocale,
} from './locales';
import { routing } from './routing';

describe('content locales', () => {
  it('maps fa, en, and ar to themselves (no ar→fa collapse)', () => {
    expect(toContentLocale('fa')).toBe('fa');
    expect(toContentLocale('en')).toBe('en');
    expect(toContentLocale('ar')).toBe('ar');
  });

  it('includes Arabic in content locale definitions', () => {
    expect(CONTENT_LOCALE_DEFINITIONS.ar).toEqual({
      code: 'ar',
      nativeName: 'العربية',
      dir: 'rtl',
    });
  });
});

describe('UI locale catalog', () => {
  it('includes ar in routing and locale definitions', () => {
    expect(routing.locales).toContain('ar');
    expect(LOCALE_DEFINITIONS.ar).toEqual({
      code: 'ar',
      nativeName: 'العربية',
      numberLocale: 'ar',
      dir: 'rtl',
    });
  });

  it('marks fa and ar as rtl', () => {
    expect(getDir('fa')).toBe('rtl');
    expect(getDir('ar')).toBe('rtl');
    expect(getDir('en')).toBe('ltr');
  });

  it('omits prefix for default locale', () => {
    expect(localePathPrefix('fa')).toBe('');
    expect(localePathPrefix('en')).toBe('/en');
    expect(localePathPrefix('ar')).toBe('/ar');
    expect(localizedPath('ar', '/admin/login')).toBe('/ar/admin/login');
  });
});
