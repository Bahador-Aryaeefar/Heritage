import { setRequestLocale } from 'next-intl/server';
import { SiteForm } from '@/components/admin/site-form';

type NewSitePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewSitePage({ params }: NewSitePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SiteForm />;
}
