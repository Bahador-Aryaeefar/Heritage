import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LandingHero } from '@/components/public/landing-hero';
import { PromoBanner } from '@/components/public/promo-banner';
import { HowItWorks } from '@/components/public/how-it-works';
import { SitesGrid } from '@/components/public/sites-grid';
import { RevealOnScroll } from '@/components/public/reveal-on-scroll';
import { getLandingOrEmpty } from '@/lib/sites';
import { heritageImages } from '@/lib/heritage-images';
import { buildPlaqueQrUrl, buildSiteQrPngUrl } from '@/lib/qr-url';
import type { Locale } from '@heritage/shared-types';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const landing = await getLandingOrEmpty();
  const steps = t.raw('how.steps') as Array<{ title: string; body: string }>;
  const heroImageSrc = heritageImages.hero.src;
  const heroAlt = locale === 'fa' ? heritageImages.hero.altFa : heritageImages.hero.altEn;
  const bannerTopAlt =
    locale === 'fa' ? heritageImages.bannerTop.altFa : heritageImages.bannerTop.altEn;
  const bannerMidAlt =
    locale === 'fa' ? heritageImages.bannerMid.altFa : heritageImages.bannerMid.altEn;
  const qrUrl = buildPlaqueQrUrl('taq-e-bostan');
  const plaqueDownloadUrl = buildSiteQrPngUrl('taq-e-bostan');
  const tQr = await getTranslations('site.qr');

  return (
    <>
      <LandingHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        titleAccent={t('titleAccent')}
        description={t('description')}
        ctaPrimary={t('ctaPrimary')}
        ctaSecondary={t('ctaSecondary')}
        plaqueSite={t('plaqueSite')}
        plaqueLocation={t('plaqueLocation')}
        brandName={t('plaqueBrandName')}
        brandTagline={t('plaqueBrandTagline')}
        heroImageSrc={heroImageSrc}
        heroImageAlt={heroAlt}
        qrUrl={qrUrl}
        plaqueDownloadUrl={plaqueDownloadUrl}
        downloadLabel={tQr('download')}
      />
      <RevealOnScroll>
        <PromoBanner
          title={t('banners.top.title')}
          body={t('banners.top.body')}
          cta={t('banners.top.cta')}
          href={t('banners.top.href')}
          variant="neutral"
          imageSrc={heritageImages.bannerTop.src}
          imageAlt={bannerTopAlt}
        />
      </RevealOnScroll>
      <RevealOnScroll>
        <HowItWorks
          locale={locale as Locale}
          eyebrow={t('how.eyebrow')}
          title={t('how.title')}
          steps={steps}
        />
      </RevealOnScroll>
      <RevealOnScroll>
        <PromoBanner
          title={t('banners.mid.title')}
          body={t('banners.mid.body')}
          cta={t('banners.mid.cta')}
          href={t('banners.mid.href')}
          variant="accent"
          imageSrc={heritageImages.bannerMid.src}
          imageAlt={bannerMidAlt}
        />
      </RevealOnScroll>
      <RevealOnScroll>
        <SitesGrid
          sites={landing.sites}
          locale={locale as Locale}
          eyebrow={t('sites.eyebrow')}
          title={t('sites.title')}
          empty={t('sites.empty')}
        />
      </RevealOnScroll>
    </>
  );
}
