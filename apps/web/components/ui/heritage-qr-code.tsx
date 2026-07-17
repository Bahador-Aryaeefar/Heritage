'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import { LogoMark } from '@/components/public/logo-mark';

type HeritageQrCodeProps = {
  url: string;
  size?: number;
  label?: string;
};

export function HeritageQrCode({ url, size = 88, label = 'QR code' }: HeritageQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: size,
      color: { dark: '#2A1D14', light: '#FFFFFF' },
    }).catch(() => {
      // Canvas render failed; leave blank rather than throw in UI.
    });
  }, [url, size]);

  const logoSize = Math.round(size * 0.28);
  const padSize = Math.round(size * 0.34);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center rounded-button bg-white p-1.5 shadow-sm"
      role="img"
      aria-label={label}
    >
      <canvas ref={canvasRef} width={size} height={size} className="block rounded-[6px]" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white"
        style={{ width: padSize, height: padSize }}
      >
        <LogoMark style={{ width: logoSize, height: logoSize } as CSSProperties} />
      </div>
    </div>
  );
}
