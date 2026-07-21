import {
  landingResponseSchema,
  siteDetailSchema,
  type LandingResponse,
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

// The web Docker image is built before the API container exists, so the
// landing prerender must not require a reachable API. Only during
// `next build` an unreachable API falls back to an empty landing; the page
// self-heals via ISR (revalidate 60) once the API is up. At runtime the
// error still propagates, so a failed revalidation keeps serving the cached
// page instead of replacing it with an empty one.
export async function getLandingWithBuildFallback(): Promise<LandingResponse> {
  try {
    return await getLanding();
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return {
        items: [],
        meta: {
          page: 1,
          limit: 100,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
    throw error;
  }
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
