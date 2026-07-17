import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, normalize, resolve } from 'node:path';
import sharp from 'sharp';
import type { Env } from '../config/env';
import type { StorageService, StoredFile } from './storage.interface';

const IMAGE_MAX_WIDTH = 1920;
const ALLOWED_AUDIO = new Set(['audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm']);

@Injectable()
export class LocalDiskStorageService implements StorageService {
  private readonly uploadRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    const configured: string = this.config.getOrThrow('UPLOAD_DIR');
    this.uploadRoot = resolve(process.cwd(), configured);
    const baseUrl: string = this.config.getOrThrow('PUBLIC_ASSET_BASE_URL');
    this.publicBaseUrl = baseUrl.replace(/\/$/, '');
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  async saveImage(siteId: string, buffer: Buffer, filenameBase: string): Promise<StoredFile> {
    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const dir = join(this.uploadRoot, 'sites', siteId, 'images');
    await mkdir(dir, { recursive: true });
    const fileName = `${filenameBase}.webp`;
    const diskPath = join(dir, fileName);
    await writeFile(diskPath, processed);

    return {
      url: `/uploads/sites/${siteId}/images/${fileName}`,
      mimeType: 'image/webp',
    };
  }

  async saveBinary(
    siteId: string,
    kind: 'video' | 'audio',
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<StoredFile> {
    const allowed = kind === 'audio' ? ALLOWED_AUDIO : ALLOWED_VIDEO;
    if (!allowed.has(mimeType)) {
      throw new Error(`Unsupported ${kind} mime type: ${mimeType}`);
    }

    const dir = join(this.uploadRoot, 'sites', siteId, kind);
    await mkdir(dir, { recursive: true });
    const fileName = `${randomUUID()}.${extension.replace(/^\./, '')}`;
    const diskPath = join(dir, fileName);
    await writeFile(diskPath, buffer);

    return {
      url: `/uploads/sites/${siteId}/${kind}/${fileName}`,
      mimeType,
    };
  }

  async deleteByUrl(url: string): Promise<void> {
    const diskPath = this.urlToDiskPath(url);
    if (!diskPath) return;
    try {
      await unlink(diskPath);
    } catch {
      // File may already be gone.
    }
  }

  toAbsoluteUrl(relativeUploadUrl: string): string {
    if (relativeUploadUrl.startsWith('http://') || relativeUploadUrl.startsWith('https://')) {
      return relativeUploadUrl;
    }
    return `${this.publicBaseUrl}${relativeUploadUrl.startsWith('/') ? '' : '/'}${relativeUploadUrl}`;
  }

  urlToDiskPath(url: string): string | null {
    if (!url.startsWith('/uploads/')) return null;
    const rel = url.slice('/uploads/'.length);
    const abs = resolve(this.uploadRoot, rel);
    const normalizedRoot = normalize(this.uploadRoot + '/');
    if (!abs.startsWith(normalizedRoot)) return null;
    return abs;
  }
}
