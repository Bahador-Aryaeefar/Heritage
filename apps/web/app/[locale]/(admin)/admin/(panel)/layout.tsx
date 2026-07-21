import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { QueryProviders } from '@/components/admin/query-providers';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminAuthGate } from '@/components/admin/admin-auth-gate';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth-constants';
import { getServerSessionUser } from '@/lib/admin-session';
import { localizedPath } from '@/i18n/locales';

type AdminPanelLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminPanelLayout({ children, params }: AdminPanelLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loginPath = localizedPath(locale, '/admin/login');

  const user = await getServerSessionUser();
  const t = await getTranslations('admin.shell');
  const labels = {
    sites: t('sites'),
    users: t('users'),
    logout: t('logout'),
    panelTitle: t('title'),
    brandTagline: t('brandTagline'),
    roleAdmin: t('roleAdmin'),
    roleSuperAdmin: t('roleSuperAdmin'),
    loading: t('loading'),
  };

  if (user) {
    return (
      <QueryProviders>
        <AdminShell user={user} labels={labels}>
          {children}
        </AdminShell>
      </QueryProviders>
    );
  }

  const cookieStore = await cookies();
  const hasSessionCookie =
    cookieStore.has(ACCESS_COOKIE) || cookieStore.has(REFRESH_COOKIE);
  if (!hasSessionCookie) {
    redirect(loginPath);
  }

  return (
    <QueryProviders>
      <AdminAuthGate loginPath={loginPath} labels={labels}>
        {children}
      </AdminAuthGate>
    </QueryProviders>
  );
}
