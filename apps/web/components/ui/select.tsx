'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import {
  measurePortalMenu,
  subscribePortalMenuPosition,
  type PortalMenuBox,
} from '@/lib/measure-portal-menu';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
};

export function Select({
  value,
  onChange,
  options,
  placeholder = '-',
  disabled = false,
  dir,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<PortalMenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuBox(null);
      return;
    }

    function update() {
      if (!triggerRef.current) return;
      setMenuBox(measurePortalMenu(triggerRef.current, { matchTriggerWidth: true }));
    }

    update();
    return subscribePortalMenuPosition(update);
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

  const menu =
    open && menuBox && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            dir={dir}
            style={{
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
              // Above Leaflet panes/controls (400–1000) and admin chrome.
              zIndex: 1100,
            }}
            className="overflow-auto rounded-card border border-brown-800/15 bg-white py-1 shadow-[0_12px_32px_rgba(42,29,20,0.16)]"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`block w-full px-4 py-2.5 text-start text-[15px] transition-colors ${
                      isSelected
                        ? 'bg-teal-700 font-bold text-sand-50'
                        : 'text-brown-800 hover:bg-sand-50'
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative" dir={dir}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-button border border-brown-800/25 bg-white px-4 py-3 text-start text-[15px] text-brown-950 outline-none transition-colors hover:border-brown-800/40 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 disabled:opacity-60"
      >
        <span className={selected ? 'text-brown-950' : 'text-brown-600/70'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>
      {menu}
    </div>
  );
}
