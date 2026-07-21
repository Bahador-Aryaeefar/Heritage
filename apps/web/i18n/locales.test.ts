import { describe, expect, it } from 'vitest';
import {
  CONTENT_LOCALE_DEFINITIONS,
  getDir,
  localePathPrefix,
  localizedPath,
  toContentLocale,
} from './locales';

describe('locales catalog', () => {
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

  it('maps arabic UI to persian content until ar translations exist', () => {
    expect(toContentLocale('ar')).toBe('fa');
    expect(toContentLocale('en')).toBe('en');
    expect(toContentLocale('fa')).toBe('fa');
  });

  it('keeps permanent native names and dirs for content tabs', () => {
    expect(CONTENT_LOCALE_DEFINITIONS.fa).toEqual({
      code: 'fa',
      nativeName: 'فارسی',
      dir: 'rtl',
    });
    expect(CONTENT_LOCALE_DEFINITIONS.en).toEqual({
      code: 'en',
      nativeName: 'English',
      dir: 'ltr',
    });
  });
});
