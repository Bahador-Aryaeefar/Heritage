import { env } from '@/env';
import { localizedPath } from '@/i18n/locales';
import type { Locale } from '@/i18n/routing';

export function buildSiteQrUrl(slug: string, locale: Locale = 'fa'): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const path = localizedPath(locale, `/sites/${slug}`);
  return `${base}${path}?src=qr`;
}

/** Canonical plaque scan URL (Persian route, production domain). */
export function buildPlaqueQrUrl(slug: string): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return `${base}/sites/${slug}?src=qr`;
}

/** Same-origin path (Next rewrite → API) so browser download works reliably. */
export function buildSiteQrPngUrl(slug: string): string {
  return `/downloads/sites/${slug}/plaque.png`;
}
