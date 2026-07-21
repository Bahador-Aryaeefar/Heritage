import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { CategoryCover } from '@/components/ui/category-cover';
import { HeritageCard } from '@/components/ui/heritage-card';
import type { SiteCard } from '@heritage/shared-types';
import type { Locale } from '@/i18n/routing';
import { resolveCoverUrl } from '@/lib/media-url';
import { pickSiteCardTranslation } from '@/lib/sites';

export type SiteCardVariant = 'default' | 'featured' | 'compact' | 'rail';

type SiteCardProps = {
  site: SiteCard;
  locale: Locale;
  variant?: SiteCardVariant;
  /** Optional rank badge for food / list layouts (1-based). */
  index?: number;
};

const thumbHeight: Record<SiteCardVariant, string> = {
  default: 'h-[150px]',
  featured: 'h-[220px] md:h-[280px]',
  compact: 'h-[120px]',
  rail: 'h-[140px]',
};

export function SiteCard({ site, locale, variant = 'default', index }: SiteCardProps) {
  const translation = pickSiteCardTranslation(site, locale);
  const coverSrc = resolveCoverUrl(site.coverUrl, site.slug);
  return (
    <Link
      href={`/sites/${site.slug}`}
      className="group block h-full transition-transform hover:-translate-y-0.5"
    >
      <HeritageCard className="relative h-full overflow-hidden">
        {typeof index === 'number' ? (
          <span className="absolute start-3 top-3 z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-button bg-teal-700 px-2 text-xs font-bold text-sand-50">
            {index}
          </span>
        ) : null}
        <div className={`relative overflow-hidden ${thumbHeight[variant]}`}>
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={site.slug}
              fill
              className="object-cover"
              sizes={
                variant === 'featured'
                  ? '(max-width: 900px) 100vw, 60vw'
                  : '(max-width: 900px) 100vw, 33vw'
              }
              unoptimized={coverSrc.endsWith('.webp')}
            />
          ) : (
            <CategoryCover category={site.category} label={site.slug} />
          )}
        </div>
        <div className={variant === 'compact' ? 'p-3.5' : 'p-[18px]'}>
          <h3
            className={`font-bold text-brown-950 group-hover:text-teal-700 ${
              variant === 'featured' ? 'text-[17px]' : 'text-[15px]'
            }`}
          >
            {translation.title}
          </h3>
          <p
            className={`mt-1 leading-relaxed text-brown-800 ${
              variant === 'compact' ? 'line-clamp-2 text-[13px]' : 'text-[15px]'
            }`}
          >
            {translation.shortDescription}
          </p>
        </div>
      </HeritageCard>
    </Link>
  );
}
