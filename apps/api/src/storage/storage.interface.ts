export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StoredFile {
  /** Path served under /uploads, e.g. /uploads/sites/abc/images/foo.webp */
  url: string;
  mimeType: string;
}

export interface StorageService {
  /** Decode + optimize an image to WebP bytes (throws on an invalid/corrupt image). */
  processImage(buffer: Buffer): Promise<Buffer>;
  /** Write already-processed WebP bytes to their final location (no re-encoding). */
  saveProcessedImage(
    siteId: string,
    processed: Buffer,
    filenameBase: string,
  ): Promise<StoredFile>;
  /** Convenience: processImage + saveProcessedImage in one call. */
  saveImage(siteId: string, buffer: Buffer, filenameBase: string): Promise<StoredFile>;
  saveBinary(
    siteId: string,
    kind: 'video' | 'audio',
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<StoredFile>;
  deleteByUrl(url: string): Promise<void>;
  toAbsoluteUrl(relativeUploadUrl: string): string;
}
