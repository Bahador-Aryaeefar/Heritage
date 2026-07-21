'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionButton } from '@/components/ui/action-button';
import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
import type { EditorBlock } from '@/lib/copy-blocks-from-fa';

export type BlockInsertMenuLabels = Pick<
  BlockListEditorLabels,
  'addHeading' | 'addParagraph' | 'addImage' | 'addAudio' | 'addVideo' | 'addBlock'
>;

type BlockInsertMenuProps = {
  labels: BlockInsertMenuLabels;
  onInsert: (type: EditorBlock['type']) => void;
  variant: 'gap' | 'end';
};

type MenuBox = {
  top: number;
  left: number;
  minWidth: number;
};

const INSERT_ITEMS: {
  type: EditorBlock['type'];
  labelKey: 'addHeading' | 'addParagraph' | 'addImage' | 'addAudio' | 'addVideo';
}[] = [
  { type: 'HEADING', labelKey: 'addHeading' },
  { type: 'PARAGRAPH', labelKey: 'addParagraph' },
  { type: 'IMAGE', labelKey: 'addImage' },
  { type: 'AUDIO', labelKey: 'addAudio' },
  { type: 'VIDEO', labelKey: 'addVideo' },
];

function measureMenu(trigger: HTMLElement): MenuBox {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const minWidth = Math.max(220, rect.width);
  const left = Math.min(rect.left, window.innerWidth - minWidth - 8);

  return {
    top: rect.bottom + gap,
    left: Math.max(8, left),
    minWidth,
  };
}

export function BlockInsertMenu({ labels, onInsert, variant }: BlockInsertMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

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

  function handleInsert(type: EditorBlock['type']) {
    onInsert(type);
    setOpen(false);
  }

  const menu =
    open && menuBox && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            style={{
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              minWidth: menuBox.minWidth,
              zIndex: 1100,
            }}
            className="overflow-hidden rounded-card border border-brown-800/15 bg-white py-1 shadow-[0_12px_32px_rgba(42,29,20,0.16)]"
          >
            {INSERT_ITEMS.map(({ type, labelKey }) => (
              <li key={type} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full cursor-pointer px-4 py-2.5 text-start text-[15px] text-brown-800 transition-colors hover:bg-sand-50"
                  onClick={() => handleInsert(type)}
                >
                  {labels[labelKey]}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={variant === 'end' ? 'flex justify-center py-2' : 'relative'}>
      <span ref={triggerRef} className="inline-flex">
        {variant === 'gap' ? (
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={labels.addBlock}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-button border-2 border-brown-800/20 bg-white text-[15px] font-bold text-brown-800 transition-transform hover:-translate-y-0.5"
          >
            +
          </button>
        ) : (
          <ActionButton
            type="button"
            variant="secondary"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((current) => !current)}
          >
            {labels.addBlock}
          </ActionButton>
        )}
      </span>
      {menu}
    </div>
  );
}
