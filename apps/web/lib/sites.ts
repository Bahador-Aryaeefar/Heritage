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

// The landing page must stay prerenderable when the API is unreachable,
// which is always the case while the web Docker image is being built (the
// api container is not on the build network). The empty grid is temporary:
// ISR re-fetches within one revalidate window once the API is up.
export async function getLandingOrEmpty(): Promise<LandingResponse> {
  try {
    return await getLanding();
  } catch {
    return { sites: [] };
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
