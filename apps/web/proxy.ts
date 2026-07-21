import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './lib/auth-constants';
import { localizedPath } from './i18n/locales';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function localeFromPathname(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return routing.defaultLocale;
}

function stripLocalePrefix(pathname: string): string {
  const locale = localeFromPathname(pathname);
  if (locale === routing.defaultLocale) return pathname;
  const stripped = pathname.slice(locale.length + 1);
  return stripped.length > 0 ? stripped : '/';
}

function isAdminProtectedPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  if (path === '/admin/login' || path.startsWith('/admin/login/')) {
    return false;
  }
  return path === '/admin' || path.startsWith('/admin/');
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminProtectedPath(pathname)) {
    const access = request.cookies.get(ACCESS_COOKIE)?.value;
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!access && !refresh) {
      const locale = localeFromPathname(pathname);
      const loginPath = localizedPath(locale, '/admin/login');
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
