'use client';

import { useEffect, useRef } from 'react';
import type { VisitSource } from '@heritage/shared-types';

type VisitTrackerProps = {
  slug: string;
  locale: string;
};

/**
 * Fires one visit-tracking beacon per mount. Runs client-side only so that
 * generateStaticParams/ISR background revalidation never counts as a visit.
 *
 * The QR-vs-web source is read from `window.location.search` on the client
 * rather than from the page's `searchParams` prop: reading `searchParams` in
 * the server component would opt the whole site detail page out of static
 * rendering (Next.js docs, page.md: "searchParams is a Request-time API...
 * Using it will opt the page into dynamic rendering at request time"), which
 * conflicts with the `revalidate = 60` ISR strategy for this route
 * (architecture-decisions.md section 15).
 */
export function VisitTracker({ slug, locale }: VisitTrackerProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const source: VisitSource = new URLSearchParams(window.location.search).get('src') === 'qr'
      ? 'QR'
      : 'WEB';
    const body = JSON.stringify({ source, locale });
    const url = `/api/v1/public/sites/${encodeURIComponent(slug)}/visits`;

    if (typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      if (queued) return;
    }

    void fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }, [slug, locale]);

  return null;
}
