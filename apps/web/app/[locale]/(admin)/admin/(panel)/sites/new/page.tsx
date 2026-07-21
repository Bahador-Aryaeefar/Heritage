import { setRequestLocale } from 'next-intl/server';
import { siteCategorySchema, type SiteCategory } from '@heritage/shared-types';
import { SiteForm } from '@/components/admin/site-form';

type NewSitePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

function parseCategory(value: string | undefined): SiteCategory {
  const parsed = siteCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : 'HISTORICAL';
}

export default async function NewSitePage({ params, searchParams }: NewSitePageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  return <SiteForm defaultCategory={parseCategory(query.category)} />;
}
