// Next.js 16 renamed middleware.ts to proxy.ts - same functionality.
// Handles next-intl locale routing. defaultLocale=fa, localeDetection=false
// so / always serves Persian unless the user picks /en explicitly.
// The admin auth check joins this file when the admin panel lands (arch doc §12d).
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, and files with an extension (favicon, images).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
