import { describe, expect, it } from 'vitest';
import { CONTENT_LOCALE_DEFINITIONS, toContentLocale } from './locales';

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
