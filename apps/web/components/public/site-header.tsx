'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogoMark } from '@/components/public/logo-mark';
import { LanguageSwitcher } from '@/components/public/language-switcher';
import { Link } from '@/i18n/navigation';

export function SiteHeader() {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/#how', label: t('how') },
    { href: '/#sites', label: t('sites') },
    { href: '/#contact', label: t('contact') },
  ];

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
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
