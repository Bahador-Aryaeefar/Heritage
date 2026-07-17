import { HeritageQrCode } from '@/components/ui/heritage-qr-code';
import { HeritageCard } from '@/components/ui/heritage-card';
import { PlaqueDownloadButton } from '@/components/public/plaque-download-button';
import { buildPlaqueQrUrl, buildSiteQrPngUrl } from '@/lib/qr-url';

type SiteQrPanelProps = {
  slug: string;
  title: string;
  scanLabel: string;
  downloadLabel: string;
};

export function SiteQrPanel({ slug, title, scanLabel, downloadLabel }: SiteQrPanelProps) {
  const qrUrl = buildPlaqueQrUrl(slug);
  const pngUrl = buildSiteQrPngUrl(slug);

  return (
    <HeritageCard className="p-6 md:p-8">
      <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-start">
        <HeritageQrCode url={qrUrl} size={120} label={scanLabel} />
        <div className="flex-1">
          <h2 className="text-base font-bold text-brown-950">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-brown-800">{scanLabel}</p>
          <PlaqueDownloadButton
            href={pngUrl}
            filename={`${slug}-plaque.png`}
            className="mt-3 inline-block rounded-button bg-teal-700 px-4 py-2 text-sm font-bold text-sand-50 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {downloadLabel}
          </PlaqueDownloadButton>
        </div>
      </div>
    </HeritageCard>
  );
}
