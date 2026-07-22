'use client';

import { useEffect, useState } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import { TextInput } from '@/components/ui/text-field';
import { isHttpUrl } from '@/lib/text-spans';

export type LinkPopoverProps = {
  open: boolean;
  initialUrl: string;
  canRemove: boolean;
  labels: { url: string; apply: string; remove: string };
  onApply: (url: string) => void;
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
    if (!isHttpUrl(url)) return;
    onApply(url.trim());
  }

  return (
    <div
      className="mb-2 rounded-card border border-brown-800/15 bg-white p-3 shadow-sm"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <TextInput
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder={labels.url}
        aria-label={labels.url}
        className="mb-2"
      />
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
