import {
  landingResponseSchema,
  siteDetailSchema,
  type Locale as ContentLocale,
  type SiteCard,
  type SiteDetail,
} from '@heritage/shared-types';
import { apiFetch } from '@/lib/api-client';
import { toContentLocale } from '@/i18n/locales';
import type { Locale as UiLocale } from '@/i18n/routing';

export async function getLanding() {
  return apiFetch('/public/landing?page=1&limit=100', landingResponseSchema, {
    next: { revalidate: 60 },
  });
}

export async function getSiteBySlug(slug: string) {
  return apiFetch(`/public/sites/${slug}`, siteDetailSchema, {
    next: { revalidate: 60 },
  });
}

export function pickSiteCardTranslation(site: SiteCard, locale: UiLocale | ContentLocale) {
  const contentLocale = toContentLocale(locale);
  return (
    site.translations.find((t) => t.locale === contentLocale) ??
    site.translations.find((t) => t.locale === 'fa') ??
    site.translations.find((t) => t.locale === 'en') ??
    site.translations[0]
  );
}

export function pickSiteDetailTranslation(site: SiteDetail, locale: UiLocale | ContentLocale) {
  const contentLocale = toContentLocale(locale);
  return (
    site.translations.find((t) => t.locale === contentLocale) ??
    site.translations.find((t) => t.locale === 'fa') ??
    site.translations.find((t) => t.locale === 'en') ??
    site.translations[0]
  );
}

export function localizedPlaceName(
  locale: UiLocale | ContentLocale,
  fa: string,
  en: string,
): string {
  return toContentLocale(locale) === 'en' ? en : fa;
}

export function formatStepNumber(locale: UiLocale | ContentLocale, index: number): string {
  const num = String(index + 1).padStart(2, '0');
  if (toContentLocale(locale) !== 'fa') return num;
  return num.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}
