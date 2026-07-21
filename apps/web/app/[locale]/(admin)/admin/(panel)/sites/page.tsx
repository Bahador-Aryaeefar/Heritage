import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SitesList } from '@/components/admin/sites-list';

type SitesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSitesPage({ params }: SitesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.sites');

  return (
    <SitesList
      labels={{
        title: t('title'),
        newSite: t('newSite'),
        active: t('active'),
        inactive: t('inactive'),
        edit: t('edit'),
        loading: t('loading'),
        empty: t('empty'),
        ancient: t('ancient'),
        islamic: t('islamic'),
        natural: t('natural'),
      }}
    />
  );
}
