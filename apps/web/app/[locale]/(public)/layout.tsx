import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { SiteHeader } from '@/components/public/site-header';
import { SiteFooter } from '@/components/public/site-footer';
import { getMemberSessionUser } from '@/lib/member-session';

type PublicLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('footer');
  const member = await getMemberSessionUser();

  return (
    <div className="relative flex min-h-screen flex-col">
      <HeritagePageBackground />
      <SiteHeader member={member} />
      <main className="relative flex-1">{children}</main>
      <SiteFooter tagline={t('tagline')} />
    </div>
  );
}
