import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { siteCategorySchema, type SiteCategory } from '@heritage/shared-types';
import { SitesList } from '@/components/admin/sites-list';
import { localizedPath } from '@/i18n/locales';

type SitesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

function parseCategory(value: string | undefined): SiteCategory | null {
  const parsed = siteCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function AdminSitesPage({ params, searchParams }: SitesPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const category = parseCategory(query.category);
  if (!category) {
    redirect(localizedPath(locale, '/admin/sites?category=HISTORICAL'));
  }

  const t = await getTranslations('admin.sites');
  const categoryKey = category.toLowerCase() as
    | 'historical'
    | 'handicraft'
    | 'street'
    | 'landmark'
    | 'food';

  return (
    <SitesList
      key={category}
      category={category}
      labels={{
        active: t('active'),
        inactive: t('inactive'),
        edit: t('edit'),
        delete: t('delete'),
        deleteFailed: t('deleteFailed'),
        loading: t('loading'),
        search: t('search'),
        first: t('first'),
        previous: t('previous'),
        next: t('next'),
        last: t('last'),
        category: {
          label: t(`categories.${categoryKey}.label`),
          newEntry: t(`categories.${categoryKey}.newEntry`),
          empty: t(`categories.${categoryKey}.empty`),
          deleteConfirm: t(`categories.${categoryKey}.deleteConfirm`),
        },
      }}
    />
  );
}
