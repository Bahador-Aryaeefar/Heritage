'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

type PlaqueDownloadButtonProps = {
  href: string;
  filename: string;
  className?: string;
  children: ReactNode;
};

export function PlaqueDownloadButton({
  href,
  filename,
  className = '',
  children,
}: PlaqueDownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(href);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(href, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={className}>
      {children}
    </button>
  );
}
