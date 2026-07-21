'use client';

import { HeritageQrCode } from '@/components/ui/heritage-qr-code';
import { PlaqueDownloadButton } from '@/components/public/plaque-download-button';
import { buildPlaqueQrUrl, buildSiteQrPngUrl } from '@/lib/qr-url';

export type AdminSiteQrPanelLabels = {
  title: string;
  scan: string;
  download: string;
  targetUrl: string;
};

type AdminSiteQrPanelProps = {
  slug: string;
  labels: AdminSiteQrPanelLabels;
};

/**
 * Admin edit-form QR section: live canvas preview of the slug-derived scan URL
 * plus same-origin plaque PNG download (API generates the printable plaque).
 */
export function AdminSiteQrPanel({ slug, labels }: AdminSiteQrPanelProps) {
  const qrUrl = buildPlaqueQrUrl(slug);
  const pngUrl = buildSiteQrPngUrl(slug);

  return (
    <section
      aria-labelledby="admin-site-qr-heading"
      className="rounded-card border border-brown-800/15 bg-white p-5 md:p-6"
    >
      <h2 id="admin-site-qr-heading" className="text-[15px] font-bold text-brown-950">
        {labels.title}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-4 md:flex-row md:items-start md:text-start">
        <HeritageQrCode url={qrUrl} size={120} label={labels.scan} />
        <div className="min-w-0 flex-1 space-y-3 text-center md:text-start">
          <p className="text-[15px] leading-relaxed text-brown-800">{labels.scan}</p>
          <p className="break-all text-[13px] text-brown-600">
            <span className="font-bold text-brown-800">{labels.targetUrl}: </span>
            <span dir="ltr" className="inline-block max-w-full">
              {qrUrl}
            </span>
          </p>
          <PlaqueDownloadButton
            href={pngUrl}
            filename={`${slug}-plaque.png`}
            className="inline-flex cursor-pointer items-center justify-center rounded-button bg-teal-700 px-5 py-2.5 text-[15px] font-bold text-sand-50 transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {labels.download}
          </PlaqueDownloadButton>
        </div>
      </div>
    </section>
  );
}
