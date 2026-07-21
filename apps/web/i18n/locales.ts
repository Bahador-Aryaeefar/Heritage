import type { Locale } from '@heritage/shared-types';

export type LocaleDirection = 'rtl' | 'ltr';

/**
 * Site content locales (`SiteTranslation`) — independent of the UI locale catalog.
 * Tab labels use `nativeName` (never next-intl); panels/canvas use permanent `dir`.
 */
export type ContentLocaleCode = Locale;

export type ContentLocaleDefinition = {
  code: ContentLocaleCode;
  /** Permanent endonym for content tabs (فارسی / English / العربية) — not UI-translated. */
  nativeName: string;
  dir: LocaleDirection;
};

export const CONTENT_LOCALE_DEFINITIONS: Record<ContentLocaleCode, ContentLocaleDefinition> = {
  fa: { code: 'fa', nativeName: 'فارسی', dir: 'rtl' },
  en: { code: 'en', nativeName: 'English', dir: 'ltr' },
  ar: { code: 'ar', nativeName: 'العربية', dir: 'rtl' },
};

export const CONTENT_LOCALES = Object.keys(
  CONTENT_LOCALE_DEFINITIONS,
) as ContentLocaleCode[];

/** Map UI locale → site content locale (fa | en | ar). */
export function toContentLocale(locale: string): ContentLocaleCode {
  if (locale === 'en' || locale === 'ar') return locale;
  return 'fa';
}
