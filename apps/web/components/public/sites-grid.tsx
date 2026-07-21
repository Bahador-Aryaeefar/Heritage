import { Badge } from '@/components/ui/badge';
import { SiteCard } from '@/components/public/site-card';
import type { SiteCard as SiteCardType } from '@heritage/shared-types';
import type { Locale } from '@/i18n/routing';

type SitesGridProps = {
  sites: SiteCardType[];
  locale: Locale;
  eyebrow: string;
  title: string;
  empty: string;
};

export function SitesGrid({ sites, locale, eyebrow, title, empty }: SitesGridProps) {
  return (
    <section id="sites" className="mx-auto w-full max-w-[1400px] px-[6vw] py-[70px] max-md:py-10">
      <div className="mb-9">
        <Badge>{eyebrow}</Badge>
        <h2 className="mt-3 text-[clamp(22px,2.5vw,28px)] font-black text-brown-950">{title}</h2>
      </div>
      {sites.length === 0 ? (
        <p className="text-brown-600">{empty}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.slug} site={site} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
