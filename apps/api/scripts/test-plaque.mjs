import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import QRCode from 'qrcode';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { buildBrandLockupPng, BRAND_LOCKUP_TOP } = require('../dist/src/qr/application/qr-brand-lockup.builder.js');
const { buildPlaqueSvg, PLAQUE_DIMENSIONS } = require('../dist/src/qr/application/qr-plaque.builder.js');

const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42" stroke="#4A3728" stroke-width="4"/>
  <rect x="14" y="26" width="20" height="16" rx="2" fill="#1D6F8C"/>
  <rect x="18" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="26" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="18" y="36" width="4" height="4" fill="#F5EDE1"/>
</svg>`;

const url = 'https://heritage.nobatix.ir/sites/taq-e-bostan?src=qr';
const qr = await QRCode.toBuffer(url, {
  errorCorrectionLevel: 'H',
  type: 'png',
  width: 480,
  margin: 1,
  color: { dark: '#2A1D14', light: '#FFFFFF' },
});
const logoPng = await sharp(Buffer.from(LOGO_MARK_SVG)).resize(86, 86).png().toBuffer();
const pad = await sharp({
  create: { width: 105, height: 105, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .png()
  .composite([{ input: logoPng, gravity: 'center' }])
  .toBuffer();
const qrWithLogo = await sharp(qr).composite([{ input: pad, gravity: 'center' }]).png().toBuffer();

const svg = buildPlaqueSvg({
  title: 'طاق بستان',
  location: 'کرمانشاه، ایران',
  qrPngBase64: qrWithLogo.toString('base64'),
});

writeFileSync('test-plaque.svg', svg);
const basePng = await sharp(Buffer.from(svg)).png().toBuffer();
const brandLockup = await buildBrandLockupPng();
const brandLeft = Math.round((PLAQUE_DIMENSIONS.width - brandLockup.width) / 2);
const out = await sharp(basePng)
  .composite([{ input: brandLockup.png, left: brandLeft, top: BRAND_LOCKUP_TOP }])
  .png()
  .toBuffer();
writeFileSync('test-plaque.png', out);
console.log('ok', out.length, 'brand', brandLockup.width, 'x', brandLockup.height);
