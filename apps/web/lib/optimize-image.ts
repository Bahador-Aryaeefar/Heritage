const TWO_MB = 2 * 1024 * 1024;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;

function canvasToImageBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob) {
          resolve(webpBlob);
          return;
        }
        canvas.toBlob(
          (jpegBlob) => {
            if (jpegBlob) {
              resolve(jpegBlob);
              return;
            }
            reject(new Error('Failed to encode optimized image'));
          },
          'image/jpeg',
          JPEG_QUALITY,
        );
      },
      'image/webp',
      WEBP_QUALITY,
    );
  });
}

function optimizedFileName(originalName: string, mimeType: string): string {
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpeg';
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.${ext}`;
}

/**
 * Optionally downscale large images before upload. Server Sharp remains source of truth.
 * Hash uploads with {@link sha256HexOfFile} on the returned File (optimized or original).
 */
export async function optimizeImage(file: File, maxWidth = 1920): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const needsOptimize = bitmap.width > maxWidth || file.size > TWO_MB;
    if (!needsOptimize) {
      return file;
    }

    const scale =
      bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToImageBlob(canvas);
    return new File([blob], optimizedFileName(file.name, blob.type), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
