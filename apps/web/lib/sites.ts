import {
  landingResponseSchema,
  siteDetailSchema,
  type LandingResponse,
  type Locale,
  type SiteCard,
  type SiteDetail,
} from '@heritage/shared-types';
import { apiFetch } from '@/lib/api-client';

export async function getLanding() {
  return apiFetch('/public/landing', landingResponseSchema, {
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
      return { sites: [] };
    }
    throw error;
  }
}

export async function getSiteBySlug(slug: string) {
  return apiFetch(`/public/sites/${slug}`, siteDetailSchema, {
    next: { revalidate: 60 },
  });
}

export function pickSiteCardTranslation(site: SiteCard, locale: Locale) {
  return (
    site.translations.find((t) => t.locale === locale) ??
    site.translations.find((t) => t.locale === 'fa') ??
    site.translations[0]
  );
}

export function pickSiteDetailTranslation(site: SiteDetail, locale: Locale) {
  return site.translations.find((t) => t.locale === locale);
}

export function localizedPlaceName(
  locale: Locale,
  fa: string,
  en: string,
): string {
  return locale === 'fa' ? fa : en;
}

export function formatStepNumber(locale: Locale, index: number): string {
  const num = String(index + 1).padStart(2, '0');
  if (locale !== 'fa') return num;
  return num.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}
