import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { SiteHeader } from '@/components/public/site-header';
import { SiteFooter } from '@/components/public/site-footer';

type PublicLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
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
