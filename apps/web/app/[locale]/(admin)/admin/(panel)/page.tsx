import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { localizedPath } from '@/i18n/locales';

type AdminIndexProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminIndexPage({ params }: AdminIndexProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(localizedPath(locale, '/admin/sites'));
}
