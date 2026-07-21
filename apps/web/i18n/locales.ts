import { routing, type Locale as UiLocale } from './routing';
import type { Locale } from '@heritage/shared-types';

export type LocaleDirection = 'rtl' | 'ltr';

export type LocaleDefinition = {
  code: UiLocale;
  /** Native endonym shown in the switcher (فارسی, English, العربية). */
  nativeName: string;
  /** BCP 47 tag for number/date formatting. */
  numberLocale: string;
  dir: LocaleDirection;
};

/**
 * UI locale catalog — add an entry here + `messages/{code}.json` + routing.locales
 * when shipping a new language. Content locales (SiteTranslation) may lag behind.
 */
export const LOCALE_DEFINITIONS: Record<UiLocale, LocaleDefinition> = {
  fa: {
    code: 'fa',
    nativeName: 'فارسی',
    numberLocale: 'fa-IR',
    dir: 'rtl',
  },
  en: {
    code: 'en',
    nativeName: 'English',
    numberLocale: 'en-US',
    dir: 'ltr',
  },
  ar: {
    code: 'ar',
    nativeName: 'العربية',
    numberLocale: 'ar',
    dir: 'rtl',
  },
};

export function getLocaleDefinition(locale: string): LocaleDefinition {
  if (locale in LOCALE_DEFINITIONS) {
    return LOCALE_DEFINITIONS[locale as UiLocale];
  }
  return LOCALE_DEFINITIONS[routing.defaultLocale];
}

export function getDir(locale: string): LocaleDirection {
  return getLocaleDefinition(locale).dir;
}

/** Path prefix for non-default locales (`/en`, `/ar`); empty for default `fa`. */
export function localePathPrefix(locale: string): string {
  if (locale === routing.defaultLocale || !(routing.locales as readonly string[]).includes(locale)) {
    return '';
  }
  return `/${locale}`;
}

export function localizedPath(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${localePathPrefix(locale)}${normalized}`;
}

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
