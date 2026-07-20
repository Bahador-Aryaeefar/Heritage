import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { adminSiteSchema } from '@heritage/shared-types';
import { SiteForm } from '@/components/admin/site-form';
import { env } from '@/env';
import { cookies } from 'next/headers';

type EditSitePageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditSitePage({ params }: EditSitePageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  let site;
  try {
    const cookieStore = await cookies();
    const response = await fetch(`${env.API_BASE_URL}/admin/sites/${id}`, {
      headers: { cookie: cookieStore.toString() },
      cache: 'no-store',
    });

    if (!response.ok) {
      notFound();
    }

    site = adminSiteSchema.parse(await response.json());
  } catch {
    notFound();
  }

  return <SiteForm site={site} />;
}
