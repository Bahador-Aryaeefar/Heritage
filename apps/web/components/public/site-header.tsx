'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AuthUser } from '@heritage/shared-types';
import { LogoMark } from '@/components/public/logo-mark';
import { LanguageSwitcher } from '@/components/public/language-switcher';
import { Link } from '@/i18n/navigation';

type SiteHeaderProps = {
  member: AuthUser | null;
};

export function SiteHeader({ member }: SiteHeaderProps) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/#categories', label: t('sites') },
    { href: '/#how', label: t('how') },
    { href: '/#contact', label: t('contact') },
  ];

  const authLink = member
    ? { href: '/profile', label: t('viewProfile') }
    : { href: '/login', label: t('signIn') };

  return (
    <header className="sticky top-0 z-30 border-b border-brown-800/10 bg-sand-100/92 backdrop-blur-md">
      <div className="relative mx-auto flex w-full max-w-[1400px] items-center justify-between px-[6vw] py-5">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark />
          <div>
            <span className="block text-[19px] font-black tracking-wide text-brown-800">
              شهرنما
            </span>
            <span className="block text-[11px] tracking-widest text-teal-700">SHAHRNAMA</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-brown-800 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-teal-700">
              {link.label}
            </Link>
          ))}
          <Link
            href={authLink.href}
            className={`cursor-pointer rounded-button border-2 px-4 py-2 text-[15px] font-bold transition-transform hover:-translate-y-0.5 ${
              member
                ? 'border-teal-700 bg-teal-700 text-sand-50'
                : 'border-brown-800 bg-transparent text-brown-800'
            }`}
          >
            {authLink.label}
          </Link>
          <LanguageSwitcher />
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            aria-label={t('menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-button border border-brown-800/20 px-3 py-2 text-sm font-bold text-brown-800"
          >
            {t('menu')}
          </button>
        </div>

        {open ? (
          <div className="absolute inset-x-0 top-full z-20 border-b border-brown-800/10 bg-sand-100 px-[6vw] py-4 lg:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium text-brown-800">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link
                href={authLink.href}
                onClick={() => setOpen(false)}
                className={`mt-1 w-fit cursor-pointer rounded-button border-2 px-4 py-2 text-[15px] font-bold ${
                  member
                    ? 'border-teal-700 bg-teal-700 text-sand-50'
                    : 'border-brown-800 bg-transparent text-brown-800'
                }`}
              >
                {authLink.label}
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
