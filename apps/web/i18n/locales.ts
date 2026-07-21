import { routing, type Locale } from './routing';

export type LocaleDirection = 'rtl' | 'ltr';

export type LocaleDefinition = {
  code: Locale;
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
export const LOCALE_DEFINITIONS: Record<Locale, LocaleDefinition> = {
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
    return LOCALE_DEFINITIONS[locale as Locale];
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
export type ContentLocaleCode = 'fa' | 'en';

export type ContentLocaleDefinition = {
  code: ContentLocaleCode;
  /** Permanent endonym for content tabs (فارسی / English) — not UI-translated. */
  nativeName: string;
  dir: LocaleDirection;
};

export const CONTENT_LOCALE_DEFINITIONS: Record<
  ContentLocaleCode,
  ContentLocaleDefinition
> = {
  fa: { code: 'fa', nativeName: 'فارسی', dir: 'rtl' },
  en: { code: 'en', nativeName: 'English', dir: 'ltr' },
};

export const CONTENT_LOCALES = Object.keys(
  CONTENT_LOCALE_DEFINITIONS,
) as ContentLocaleCode[];

/**
 * Map UI locale → content locale stored on sites (currently fa | en only).
 * Arabic UI falls back to Persian content until `ar` SiteTranslation exists.
 */
export function toContentLocale(locale: string): ContentLocaleCode {
  return locale === 'en' ? 'en' : 'fa';
}
