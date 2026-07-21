import { SiteCard } from '@/components/public/site-card';
import { SitesCarousel } from '@/components/public/sites-carousel';
import type { SiteCard as SiteCardType, SiteCategory } from '@heritage/shared-types';
import type { Locale } from '@/i18n/routing';
import { categoryAnchorId } from '@/lib/category-anchor';

type CategorySectionProps = {
  category: SiteCategory;
  title: string;
  blurb: string;
  empty: string;
  prevLabel: string;
  nextLabel: string;
  sites: SiteCardType[];
  locale: Locale;
};

const densityByCategory: Record<
  SiteCategory,
  'default' | 'compact' | 'rail' | 'featured'
> = {
  HISTORICAL: 'featured',
  HANDICRAFT: 'compact',
  STREET: 'rail',
  LANDMARK: 'default',
  FOOD: 'default',
};

const variantByCategory: Record<SiteCategory, 'default' | 'featured' | 'compact' | 'rail'> = {
  HISTORICAL: 'featured',
  HANDICRAFT: 'compact',
  STREET: 'rail',
  LANDMARK: 'default',
  FOOD: 'default',
};

export function CategorySection({
  category,
  title,
  blurb,
  empty,
  prevLabel,
  nextLabel,
  sites,
  locale,
}: CategorySectionProps) {
  return (
    <section
      id={categoryAnchorId(category)}
      className="scroll-mt-24 mx-auto w-full max-w-[1400px] px-[6vw] py-[70px] max-md:py-10"
    >
      <div className="mb-8 max-w-2xl">
        <h2 className="text-[clamp(22px,2.5vw,28px)] font-black text-brown-950">{title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-brown-600">{blurb}</p>
      </div>

      {sites.length === 0 ? (
        <p className="text-[15px] text-brown-600">{empty}</p>
      ) : (
        <SitesCarousel
          itemCount={sites.length}
          density={densityByCategory[category]}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
        >
          {sites.map((site, index) => (
            <SiteCard
              key={site.slug}
              site={site}
              locale={locale}
              variant={variantByCategory[category]}
              index={category === 'FOOD' ? index + 1 : undefined}
            />
          ))}
        </SitesCarousel>
      )}
    </section>
  );
}
