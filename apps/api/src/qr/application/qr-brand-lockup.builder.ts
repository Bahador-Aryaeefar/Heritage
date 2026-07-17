import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { join } from 'node:path';
import sharp from 'sharp';

const BRAND_NAME_FA = 'میراث کرمانشاه';
const BRAND_TAGLINE_EN = 'KERMANSHAH HERITAGE';
const BROWN_800 = '#4A3728';
const TEAL_700 = '#1D6F8C';

const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42" stroke="#4A3728" stroke-width="4"/>
  <rect x="14" y="26" width="20" height="16" rx="2" fill="#1D6F8C"/>
  <rect x="18" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="26" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="18" y="36" width="4" height="4" fill="#F5EDE1"/>
</svg>`;

const LOGO_SIZE = 38;
const LOGO_TEXT_GAP = 12;

let fontRegistered = false;

function ensureFont(): void {
  if (fontRegistered) return;
  const fontPath = join(
    require.resolve('@fontsource/vazirmatn/package.json'),
    '../files/vazirmatn-arabic-700-normal.woff',
  );
  GlobalFonts.registerFromPath(fontPath, 'Vazirmatn');
  fontRegistered = true;
}

export type BrandLockupImage = {
  png: Buffer;
  width: number;
  height: number;
};

export async function buildBrandLockupPng(): Promise<BrandLockupImage> {
  ensureFont();

  const measure = createCanvas(1, 1).getContext('2d');
  measure.font = '700 16px Vazirmatn';
  const faWidth = measure.measureText(BRAND_NAME_FA).width;
  measure.font = '700 9px Arial';
  const enWidth = measure.measureText(BRAND_TAGLINE_EN).width;

  const textWidth = Math.ceil(Math.max(faWidth, enWidth));
  const width = LOGO_SIZE + LOGO_TEXT_GAP + textWidth;
  const height = 42;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const logoPng = await sharp(Buffer.from(LOGO_MARK_SVG)).resize(LOGO_SIZE, LOGO_SIZE).png().toBuffer();
  const logoImage = await loadImage(logoPng);
  ctx.drawImage(logoImage, 0, (height - LOGO_SIZE) / 2, LOGO_SIZE, LOGO_SIZE);

  const textX = LOGO_SIZE + LOGO_TEXT_GAP;

  ctx.fillStyle = BROWN_800;
  ctx.font = '700 16px Vazirmatn';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(BRAND_NAME_FA, textX, 4);

  ctx.fillStyle = TEAL_700;
  ctx.font = '700 9px Arial';
  ctx.fillText(BRAND_TAGLINE_EN, textX, 24);

  return {
    png: canvas.toBuffer('image/png'),
    width,
    height,
  };
}

export const BRAND_LOCKUP_TOP = 488;
