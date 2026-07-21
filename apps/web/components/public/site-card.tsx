import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { HeritageCard } from '@/components/ui/heritage-card';
import type { SiteCard } from '@heritage/shared-types';
import type { Locale } from '@/i18n/routing';
import { resolveCoverUrl } from '@/lib/media-url';
import { pickSiteCardTranslation } from '@/lib/sites';

type SiteCardProps = {
  site: SiteCard;
  locale: Locale;
};

export function SiteCard({ site, locale }: SiteCardProps) {
  const translation = pickSiteCardTranslation(site, locale);
  const coverSrc = resolveCoverUrl(site.coverUrl, site.slug);

  return (
    <Link href={`/sites/${site.slug}`} className="group block transition-transform hover:-translate-y-0.5">
      <HeritageCard className="h-full overflow-hidden">
        <div className="relative h-[150px] bg-linear-to-br from-teal-700/20 to-brown-800/20">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={translation.title}
              fill
              className="object-cover"
              sizes="(max-width: 900px) 100vw, 33vw"
              unoptimized={coverSrc.endsWith('.webp')}
            />
          ) : null}
        </div>
        <div className="p-[18px]">
          <h3 className="text-[15px] font-bold text-brown-950 group-hover:text-teal-700">
            {translation.title}
          </h3>
          <p className="mt-1 text-[15px] leading-relaxed text-brown-800">{translation.shortDescription}</p>
        </div>
      </HeritageCard>
    </Link>
  );
}
