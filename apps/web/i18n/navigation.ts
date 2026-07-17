import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware wrappers around Next's navigation APIs. Always import these
// instead of next/link / next/navigation so locale prefixes are preserved
// (e.g. the LanguageSwitcher keeps the user on the same page - arch doc §12e).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
