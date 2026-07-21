import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SITE_CATEGORIES, type SiteCategory } from '@heritage/shared-types';
import { LandingHero } from '@/components/public/landing-hero';
import { PromoBanner } from '@/components/public/promo-banner';
import { HowItWorks } from '@/components/public/how-it-works';
import { CategoryStack, type CategoryStackCard } from '@/components/public/category-stack';
import { CategorySection } from '@/components/public/category-section';
import { RevealOnScroll } from '@/components/public/reveal-on-scroll';
import { getLandingWithBuildFallback } from '@/lib/sites';
import { categoryAnchorId, groupSitesByCategory } from '@/lib/category-anchor';
import { heritageImages, landingBannerImages, type LandingBannerKey } from '@/lib/heritage-images';
import { buildPlaqueQrUrl, buildSiteQrPngUrl } from '@/lib/qr-url';
import type { Locale } from '@/i18n/routing';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string }>;
};

function TopicBanner({
  bannerKey,
  title,
  body,
  cta,
  href,
  locale,
}: {
  bannerKey: LandingBannerKey;
  title: string;
  body: string;
  cta: string;
  href: string;
  locale: string;
}) {
  const image = landingBannerImages[bannerKey];
  const imageAlt = locale === 'en' ? image.altEn : image.altFa;
  const variant = bannerKey === 'how' || bannerKey === 'STREET' || bannerKey === 'FOOD' ? 'accent' : 'neutral';

  return (
    <RevealOnScroll>
      <PromoBanner
        title={title}
        body={body}
        cta={cta}
        href={href}
        variant={variant}
        imageSrc={image.src}
        imageAlt={imageAlt}
      />
    </RevealOnScroll>
  );
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tCategory = await getTranslations('site.category');
  const landing = await getLandingWithBuildFallback();
  const steps = t.raw('how.steps') as Array<{ title: string; body: string }>;
  const heroImageSrc = heritageImages.hero.src;
  const heroAlt = locale === 'en' ? heritageImages.hero.altEn : heritageImages.hero.altFa;
  const qrUrl = buildPlaqueQrUrl('taq-e-bostan');
  const plaqueDownloadUrl = buildSiteQrPngUrl('taq-e-bostan');
  const tQr = await getTranslations('site.qr');

  const grouped = groupSitesByCategory(landing.items);
  const blurbs = t.raw('categories.blurbs') as Record<SiteCategory, string>;
  const stackCards: CategoryStackCard[] = SITE_CATEGORIES.map((category) => {
    const sites = grouped[category];
    const featured = sites.find((site) => site.coverUrl) ?? sites[0];
    return {
      category,
      title: tCategory(category),
      blurb: blurbs[category],
      coverUrl: featured?.coverUrl ?? null,
      coverSlug: featured?.slug ?? category.toLowerCase(),
      countLabel: t('categories.count', { count: sites.length }),
    };
  });

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
        <CategoryStack
          cards={stackCards}
          eyebrow={t('categories.eyebrow')}
          title={t('categories.stackTitle')}
          hint={t('categories.stackHint')}
        />
      </RevealOnScroll>

      <TopicBanner
        bannerKey="how"
        title={t('banners.how.title')}
        body={t('banners.how.body')}
        cta={t('banners.how.cta')}
        href={t('banners.how.href')}
        locale={locale}
      />
      <RevealOnScroll>
        <HowItWorks
          locale={locale as Locale}
          eyebrow={t('how.eyebrow')}
          title={t('how.title')}
          steps={steps}
        />
      </RevealOnScroll>

      {SITE_CATEGORIES.map((category) => (
        <div key={category}>
          <TopicBanner
            bannerKey={category}
            title={t(`banners.categories.${category}.title`)}
            body={t(`banners.categories.${category}.body`)}
            cta={t(`banners.categories.${category}.cta`)}
            href={`#${categoryAnchorId(category)}`}
            locale={locale}
          />
          <RevealOnScroll>
            <CategorySection
              category={category}
              title={tCategory(category)}
              blurb={blurbs[category]}
              empty={t('categories.empty')}
              prevLabel={t('categories.prev')}
              nextLabel={t('categories.next')}
              sites={grouped[category]}
              locale={locale as Locale}
            />
          </RevealOnScroll>
        </div>
      ))}
    </>
  );
}
