import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BROWN_950 = '#2A1D14';
const SAND_100 = '#F5EDE1';
const TEAL_700 = '#1D6F8C';

const PLAQUE_WIDTH = 540;
const PLAQUE_HEIGHT = 640;

let cachedFontBase64: string | null = null;

function getVazirmatnBoldBase64(): string {
  if (cachedFontBase64) return cachedFontBase64;
  const fontPath = join(
    require.resolve('@fontsource/vazirmatn/package.json'),
    '../files/vazirmatn-arabic-700-normal.woff',
  );
  cachedFontBase64 = readFileSync(fontPath).toString('base64');
  return cachedFontBase64;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PlaqueContent = {
  title: string;
  location: string;
  qrPngBase64: string;
};

export function buildPlaqueSvg({ title, location, qrPngBase64 }: PlaqueContent): string {
  const fontBase64 = getVazirmatnBoldBase64();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PLAQUE_WIDTH}" height="${PLAQUE_HEIGHT}" viewBox="0 0 ${PLAQUE_WIDTH} ${PLAQUE_HEIGHT}">
  <defs>
    <style>
      @font-face {
        font-family: 'Vazirmatn';
        src: url('data:font/woff;base64,${fontBase64}') format('woff');
        font-weight: 700;
      }
      .title { font-family: 'Vazirmatn', sans-serif; font-size: 34px; font-weight: 700; fill: ${BROWN_950}; }
      .location { font-family: 'Vazirmatn', sans-serif; font-size: 22px; font-weight: 700; fill: ${TEAL_700}; }
    </style>
    <pattern id="plaque-stripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="14" height="14" fill="${BROWN_950}"/>
      <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(251,247,240,0.11)" stroke-width="2"/>
    </pattern>
  </defs>

  <rect width="${PLAQUE_WIDTH}" height="${PLAQUE_HEIGHT}" rx="44" ry="44" fill="url(#plaque-stripes)"/>

  <rect x="44" y="44" width="452" height="552" rx="36" ry="36" fill="${SAND_100}"/>

  <text x="270" y="118" text-anchor="middle" class="title" direction="rtl" xml:lang="fa">${escapeXml(title)}</text>
  <text x="270" y="158" text-anchor="middle" class="location" direction="rtl" xml:lang="fa">${escapeXml(location)}</text>

  <image href="data:image/png;base64,${qrPngBase64}" x="160" y="185" width="220" height="220"/>
</svg>`;
}

export const PLAQUE_DIMENSIONS = { width: PLAQUE_WIDTH, height: PLAQUE_HEIGHT };
