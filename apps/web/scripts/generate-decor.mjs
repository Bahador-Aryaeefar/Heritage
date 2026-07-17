/**
 * Crops Art Deco corner brackets from art-deco-grid.png (3×3 reference sheet).
 * Run: pnpm --filter web generate:decor
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const decorDir = join(root, 'public', 'decor');
const gridPath = join(decorDir, 'art-deco-grid.png');

function stripNavyBackground(buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const pixels = Buffer.from(data);
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r < 55 && g < 70 && b < 110) {
          pixels[i + 3] = 0;
        }
      }
      return sharp(pixels, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toBuffer();
    });
}

const meta = await sharp(gridPath).metadata();
const cols = 3;
const rows = 3;
const cellW = Math.floor((meta.width ?? 900) / cols);
const cellH = Math.floor((meta.height ?? 900) / rows);

// Middle-left ornate corner (row 1, col 0) — best L-bracket with fan motif.
const cornerLeft = cellW * 0;
const cornerTop = cellH * 1;

const cornerRaw = await sharp(gridPath)
  .extract({ left: cornerLeft, top: cornerTop, width: cellW, height: cellH })
  .toBuffer();

const cornerTransparent = await stripNavyBackground(cornerRaw);

await mkdir(decorDir, { recursive: true });

await sharp(cornerTransparent)
  .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(decorDir, 'corner-bracket.png'));

// Top-centre cell for optional crest strip (row 0, col 1).
const crestRaw = await sharp(gridPath)
  .extract({ left: cellW, top: 0, width: cellW, height: cellH })
  .toBuffer();

const crestTransparent = await stripNavyBackground(crestRaw);

await sharp(crestTransparent)
  .resize(120, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(decorDir, 'border-crest.png'));

console.log('Border assets: public/decor/corner-bracket.png, border-crest.png');
