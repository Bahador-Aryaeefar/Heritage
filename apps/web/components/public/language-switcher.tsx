'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import { LOCALE_DEFINITIONS } from '@/i18n/locales';
import { routing, type Locale } from '@/i18n/routing';

type MenuBox = {
  top: number;
  left: number;
  minWidth: number;
  maxHeight: number;
};

function measureMenu(trigger: HTMLElement): MenuBox {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const preferredMax = 256;
  const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
  const spaceAbove = rect.top - gap - 12;
  const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(preferredMax, Math.max(120, openUp ? spaceAbove : spaceBelow));
  const top = openUp ? rect.top - gap - maxHeight : rect.bottom + gap;
  const minWidth = Math.max(rect.width, 208);
  const isRtl = getComputedStyle(trigger).direction === 'rtl';
  const left = isRtl ? rect.right - minWidth : rect.left;

  return {
    top: Math.max(8, top),
    left: Math.min(Math.max(8, left), window.innerWidth - minWidth - 8),
    minWidth,
    maxHeight,
  };
}

/**
 * Compact dropdown language switcher — scales to many locales without
 * a growing pill row. Native names come from LOCALE_DEFINITIONS.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('lang');
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = LOCALE_DEFINITIONS[locale] ?? LOCALE_DEFINITIONS.fa;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuBox(null);
      return;
    }

    function update() {
      if (!triggerRef.current) return;
      setMenuBox(measureMenu(triggerRef.current));
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  const menu =
    open && menuBox && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={t('label')}
            style={{
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              minWidth: menuBox.minWidth,
              maxHeight: menuBox.maxHeight,
              zIndex: 1100,
            }}
            className="overflow-auto rounded-card border border-brown-800/15 bg-white py-1.5 shadow-[0_12px_32px_rgba(42,29,20,0.16)]"
          >
            {routing.locales.map((code) => {
              const def = LOCALE_DEFINITIONS[code];
              const selected = code === locale;
              return (
                <li key={code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    dir={def.dir}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-start text-[15px] transition-colors ${
                      selected
                        ? 'bg-teal-700 font-bold text-sand-50'
                        : 'text-brown-800 hover:bg-sand-50'
                    }`}
                    onClick={() => selectLocale(code)}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-black uppercase tracking-wide ${
                        selected
                          ? 'bg-sand-50/20 text-sand-50'
                          : 'bg-teal-200 text-teal-700'
                      }`}
                    >
                      {code}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{def.nativeName}</span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('label')}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-w-[8.5rem] items-center justify-between gap-2.5 rounded-button border border-brown-800/25 bg-white px-3.5 py-2.5 text-[15px] font-bold text-brown-950 transition-colors hover:border-brown-800/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-200 text-[10px] font-black uppercase tracking-wide text-teal-700"
          >
            {current.code}
          </span>
          <span className="truncate">{current.nativeName}</span>
        </span>
        <ChevronIcon open={open} />
      </button>
      {menu}
    </div>
  );
}
