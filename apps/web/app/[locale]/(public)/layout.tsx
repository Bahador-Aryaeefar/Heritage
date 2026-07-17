import { getTranslations } from 'next-intl/server';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { SiteHeader } from '@/components/public/site-header';
import { SiteFooter } from '@/components/public/site-footer';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('footer');

  return (
    <div className="relative min-h-screen">
      <HeritagePageBackground />
      <SiteHeader />
      <main className="relative">{children}</main>
      <SiteFooter tagline={t('tagline')} />
    </div>
  );
}
