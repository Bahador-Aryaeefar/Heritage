'use client';

import { useEffect, useState } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import { TextInput } from '@/components/ui/text-field';
import { normalizeHttpUrl } from '@/lib/text-spans';

export type LinkPopoverProps = {
  open: boolean;
  initialUrl: string;
  canRemove: boolean;
  labels: { url: string; apply: string; remove: string; invalidUrl?: string };
  onApply: (url: string) => boolean | void;
  onRemove: () => void;
  onClose: () => void;
};

function LinkPopoverForm({
  initialUrl,
  canRemove,
  labels,
  onApply,
  onRemove,
  onClose,
}: Omit<LinkPopoverProps, 'open'>) {
  const [url, setUrl] = useState(initialUrl);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleApply() {
    const normalized = normalizeHttpUrl(url);
    if (!normalized) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    const applied = onApply(normalized);
    if (applied === false) {
      setInvalid(true);
    }
  }

  return (
    <div
      className="mb-2 rounded-card border border-brown-800/15 bg-white p-3 shadow-sm"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        // Keep editor selection when clicking chrome, but allow focusing the URL field / buttons.
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, button, a')) return;
        event.preventDefault();
      }}
    >
      <TextInput
        type="url"
        value={url}
        onChange={(event) => {
          setUrl(event.target.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          // Site form wraps the canvas; Enter must Apply, not submit save.
          event.preventDefault();
          event.stopPropagation();
          handleApply();
        }}
        placeholder={labels.url}
        aria-label={labels.url}
        aria-invalid={invalid}
        className="mb-2"
        dir="ltr"
      />
      {invalid ? (
        <p className="mb-2 text-xs text-brown-800" role="alert">
          {labels.invalidUrl ?? 'Enter a full URL (https://...)'}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <ActionButton type="button" variant="primary" onClick={handleApply}>
          {labels.apply}
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={!canRemove}
          onClick={onRemove}
        >
          {labels.remove}
        </ActionButton>
      </div>
    </div>
  );
}

export function LinkPopover({ open, initialUrl, ...rest }: LinkPopoverProps) {
  if (!open) return null;
  return <LinkPopoverForm key={initialUrl} initialUrl={initialUrl} {...rest} />;
}
