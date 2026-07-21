'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { SITE_CATEGORIES, siteCategorySchema, type AuthUser, type SiteCategory } from '@heritage/shared-types';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { LanguageSwitcher } from '@/components/public/language-switcher';
import { LogoMark } from '@/components/public/logo-mark';
import { SiteFooter } from '@/components/public/site-footer';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { adminFetchVoid } from '@/lib/admin-api';
import { localizedPath } from '@/i18n/locales';
import type { Locale } from '@/i18n/routing';

export type AdminShellCategoryLabels = Record<SiteCategory, string>;

type AdminShellProps = {
  user: AuthUser;
  children: React.ReactNode;
  labels: {
    users: string;
    logout: string;
    panelTitle: string;
    brandTagline: string;
    roleAdmin: string;
    roleSuperAdmin: string;
    footerTagline: string;
    categories: AdminShellCategoryLabels;
  };
};

function parseCategory(value: string | null): SiteCategory {
  const parsed = siteCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : 'HISTORICAL';
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-button px-3.5 py-2.5 text-[15px] font-bold transition-colors ${
        active
          ? 'bg-teal-700 text-sand-50 shadow-[0_4px_12px_rgba(29,111,140,0.28)]'
          : 'text-brown-800 hover:bg-white'
      }`}
    >
      {label}
    </Link>
  );
}

export function AdminShell({ user, children, labels }: AdminShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const loginPath = localizedPath(locale, '/admin/login');
  const activeCategory = parseCategory(searchParams.get('category'));
  const onSitesSection =
    pathname === '/admin/sites' ||
    pathname.startsWith('/admin/sites/new') ||
    /^\/admin\/sites\/[^/]+$/.test(pathname);

  async function logout() {
    await adminFetchVoid('/auth/logout', { method: 'POST' });
    window.location.href = loginPath;
  }

  const categoryItems = SITE_CATEGORIES.map((category) => ({
    href: `/admin/sites?category=${category}`,
    label: labels.categories[category],
    category,
  }));

  return (
    <div className="relative flex min-h-screen flex-col text-brown-950">
      <HeritagePageBackground />
      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 gap-5 px-[4vw] py-5 md:py-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-6 overflow-hidden rounded-container border border-brown-800/15 bg-sand-100 p-5 shadow-[0_8px_28px_rgba(42,29,20,0.08)]">
            <div className="flex items-center gap-3 border-b border-brown-800/15 pb-4">
              <div className="rounded-button bg-white p-1.5 ring-1 ring-brown-800/15">
                <LogoMark className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-black text-brown-800">
                  {labels.panelTitle}
                </div>
                <div className="truncate text-[11px] tracking-wide text-teal-700">
                  {labels.brandTagline}
                </div>
              </div>
            </div>
            <nav className="mt-4 space-y-1.5">
              {categoryItems.map((item) => {
                const active =
                  onSitesSection &&
                  (pathname === '/admin/sites' || pathname.startsWith('/admin/sites/new')
                    ? item.category === activeCategory
                    : false);
                return (
                  <NavLink key={item.href} href={item.href} label={item.label} active={active} />
                );
              })}
              {isSuperAdmin ? (
                <NavLink
                  href="/admin/users"
                  label={labels.users}
                  active={pathname.startsWith('/admin/users')}
                />
              ) : null}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 rounded-container border border-brown-800/15 bg-sand-100 px-5 py-4 shadow-[0_8px_28px_rgba(42,29,20,0.08)]">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black text-brown-950">
                {user.displayName?.trim() || user.phone}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge>
                  {user.role === 'SUPER_ADMIN' ? labels.roleSuperAdmin : labels.roleAdmin}
                </Badge>
                <span className="truncate text-xs text-brown-600" dir="ltr">
                  {user.phone}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex max-w-full flex-wrap items-center gap-2 md:hidden">
                {categoryItems.map((item) => {
                  const active =
                    onSitesSection &&
                    (pathname === '/admin/sites' || pathname.startsWith('/admin/sites/new')
                      ? item.category === activeCategory
                      : false);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-button px-3 py-2 text-[15px] font-bold ${
                        active
                          ? 'bg-teal-700 text-sand-50'
                          : 'bg-white text-brown-800 ring-1 ring-brown-800/20'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {isSuperAdmin ? (
                  <Link
                    href="/admin/users"
                    className={`rounded-button px-3 py-2 text-[15px] font-bold ${
                      pathname.startsWith('/admin/users')
                        ? 'bg-teal-700 text-sand-50'
                        : 'bg-white text-brown-800 ring-1 ring-brown-800/20'
                    }`}
                  >
                    {labels.users}
                  </Link>
                ) : null}
              </div>
              <LanguageSwitcher />
              <ActionButton type="button" variant="secondary" onClick={() => void logout()}>
                {labels.logout}
              </ActionButton>
            </div>
          </header>

          <main className="min-w-0 flex-1 rounded-container border border-brown-800/15 bg-sand-100 p-5 shadow-[0_8px_28px_rgba(42,29,20,0.08)] md:p-6">
            {children}
          </main>
        </div>
      </div>
      <SiteFooter tagline={labels.footerTagline} />
    </div>
  );
}
