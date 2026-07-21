'use client';

import Image from 'next/image';
import { LogoMark } from '@/components/public/logo-mark';
import { PlaqueDownloadButton } from '@/components/public/plaque-download-button';
import { HeritageQrCode } from '@/components/ui/heritage-qr-code';

type HeroPlaqueProps = {
  heroImageSrc: string;
  heroImageAlt: string;
  plaqueSite: string;
  plaqueLocation: string;
  brandName: string;
  brandTagline: string;
  qrUrl: string;
  plaqueDownloadUrl: string;
  downloadLabel: string;
  downloadFilename: string;
};

export function HeroPlaque({
  heroImageSrc,
  heroImageAlt,
  plaqueSite,
  plaqueLocation,
  brandName,
  brandTagline,
  qrUrl,
  plaqueDownloadUrl,
  downloadLabel,
  downloadFilename,
}: HeroPlaqueProps) {
  return (
    <div className="overflow-hidden rounded-container shadow-[0_8px_32px_rgba(42,29,20,0.18)] ring-1 ring-gold-600/30">
      <div className="relative aspect-[4/3] w-full bg-brown-950">
        <Image
          src={heroImageSrc}
          alt={heroImageAlt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
        <div className="absolute top-4 left-4 rounded-card bg-sand-50 px-3.5 py-3 shadow-[0_4px_16px_rgba(42,29,20,0.18)] ring-1 ring-brown-800/15">
          <div className="flex items-center gap-3" dir="ltr">
            <div className="rounded-md bg-white p-1 shadow-sm ring-1 ring-brown-800/10">
              <LogoMark className="h-8 w-8 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-brown-800">{brandName}</div>
              <div className="text-[11px] tracking-widest text-teal-700">{brandTagline}</div>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-brown-950/95 via-brown-950/55 to-transparent p-4 pt-14 md:p-5 md:pt-16">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-base font-bold text-sand-50">{plaqueSite}</div>
              <div className="text-sm text-teal-200">{plaqueLocation}</div>
              <PlaqueDownloadButton
                href={plaqueDownloadUrl}
                filename={downloadFilename}
                className="mt-2 inline-block text-xs font-bold text-teal-200 hover:text-sand-50 disabled:opacity-60"
              >
                {downloadLabel}
              </PlaqueDownloadButton>
            </div>
            <HeritageQrCode url={qrUrl} size={92} label={`QR code for ${plaqueSite}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
