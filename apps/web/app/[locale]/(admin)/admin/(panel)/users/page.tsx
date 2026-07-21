import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { UsersPanel } from '@/components/admin/users-panel';
import { getServerSessionUser } from '@/lib/admin-session';
import { localizedPath } from '@/i18n/locales';

type UsersPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminUsersPage({ params }: UsersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getServerSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect(localizedPath(locale, '/admin/sites'));
  }

  const t = await getTranslations('admin.users');

  return (
    <UsersPanel
      labels={{
        phone: t('phone'),
        password: t('password'),
        role: t('role'),
        displayName: t('displayName'),
        active: t('active'),
        inactive: t('inactive'),
        create: t('create'),
        save: t('save'),
        resetPassword: t('resetPassword'),
        admin: t('admin'),
        superAdmin: t('superAdmin'),
        edit: t('edit'),
        cancel: t('cancel'),
        editUser: t('editUser'),
        usersList: t('usersList'),
        loading: t('loading'),
        empty: t('empty'),
        createFailed: t('createFailed'),
        saveFailed: t('saveFailed'),
        passwordFailed: t('passwordFailed'),
      }}
    />
  );
}
