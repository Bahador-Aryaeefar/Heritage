import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { BlockRenderer } from '@/components/public/content-blocks/block-renderer';
import { SiteQrPanel } from '@/components/public/site-qr-panel';
import { ApiError } from '@/lib/api-client';
import {
  getLanding,
  getSiteBySlug,
  localizedPlaceName,
  pickSiteDetailTranslation,
} from '@/lib/sites';
import type { Locale } from '@heritage/shared-types';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  try {
    const landing = await getLanding();
    return landing.sites.flatMap((site) =>
      ['fa', 'en'].map((locale) => ({ locale, slug: site.slug })),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const site = await getSiteBySlug(slug);
    const translation = pickSiteDetailTranslation(site, locale as Locale);
    if (!translation) return { title: 'Site not found' };
    return {
      title: `${translation.title} | Kermanshah Heritage`,
      description: translation.shortDescription,
    };
  } catch {
    return { title: 'Site not found' };
  }
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let site;
  try {
    site = await getSiteBySlug(slug);
  } catch (error) {
    // Only a real 404 becomes a not-found page. A transient failure (API
    // down, network) must throw so ISR keeps serving the last good page.
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const translation = pickSiteDetailTranslation(site, locale as Locale);
  if (!translation) notFound();

  const t = await getTranslations('site.category');
  const tQr = await getTranslations('site.qr');
  const cityName = localizedPlaceName(locale as Locale, site.city.nameFa, site.city.nameEn);
  const provinceName = localizedPlaceName(
    locale as Locale,
    site.province.nameFa,
    site.province.nameEn,
  );

  return (
    <article className="mx-auto w-full max-w-[1400px] px-[5vw] py-12 md:py-16">
      <header className="mb-12 border-b border-brown-800/10 pb-10">
        <Badge>{t(site.category)}</Badge>
        <h1 className="mt-4 text-[clamp(26px,2.8vw,38px)] font-black leading-snug text-brown-950">
          {translation.title}
        </h1>
        <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-brown-800">
          {translation.shortDescription}
        </p>
        <p className="mt-3 text-sm text-teal-700">
          {cityName} · {provinceName}
        </p>
        <div className="mt-8 max-w-xl">
          <SiteQrPanel
            slug={slug}
            title={tQr('title')}
            scanLabel={tQr('scan')}
            downloadLabel={tQr('download')}
          />
        </div>
      </header>
      <div className="w-full rounded-container bg-sand-100/95 px-6 py-8 ring-1 ring-brown-800/8 backdrop-blur-[2px] md:px-10 md:py-10">
        <BlockRenderer blocks={translation.blocks} locale={locale as Locale} siteSlug={slug} />
      </div>
    </article>
  );
}
