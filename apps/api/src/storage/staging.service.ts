import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STORAGE_SERVICE, type StorageService, type StoredFile } from './storage.interface';

export interface StagingSession {
  sessionId: string;
  dir: string;
}

const STAGE_ROOT_NAME = 'heritage-stage';

@Injectable()
export class StagingService {
  private readonly sessionDirs = new Map<string, string>();

  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  createSession(): StagingSession {
    const sessionId = randomUUID();
    const dir = join(tmpdir(), STAGE_ROOT_NAME, sessionId);
    mkdirSync(dir, { recursive: true });
    this.sessionDirs.set(sessionId, dir);
    return { sessionId, dir };
  }

  async write(sessionId: string, name: string, buffer: Buffer): Promise<string> {
    const dir = this.requireDir(sessionId);
    const path = join(dir, name);
    await mkdir(dir, { recursive: true });
    await writeFile(path, buffer);
    return path;
  }

  /**
   * Decode + optimize the raw upload to WebP and stage the *optimized* bytes.
   * Running Sharp here (before any DB write) means a corrupt/undecodable image
   * fails while the caller can still abort the staging session, so promotion
   * can never leave a committed Media row with a null url.
   */
  async stageImage(sessionId: string, name: string, rawBuffer: Buffer): Promise<string> {
    const processed = await this.storage.processImage(rawBuffer);
    return this.write(sessionId, name, processed);
  }

  async promoteImage(
    sessionId: string,
    fileName: string,
    siteId: string,
    filenameBase: string,
  ): Promise<StoredFile> {
    const dir = this.requireDir(sessionId);
    // The staged bytes are already optimized WebP (see stageImage); promotion is
    // just a copy to the final /uploads location, no re-encoding.
    const processed = await readFile(join(dir, fileName));
    return this.storage.saveProcessedImage(siteId, processed, filenameBase);
  }

  async abort(sessionId: string): Promise<void> {
    await this.cleanup(sessionId);
  }

  async cleanup(sessionId: string): Promise<void> {
    const dir = this.sessionDirs.get(sessionId);
    if (!dir) return;
    await rm(dir, { recursive: true, force: true });
    this.sessionDirs.delete(sessionId);
  }

  private requireDir(sessionId: string): string {
    const dir = this.sessionDirs.get(sessionId);
    if (!dir) {
      throw new Error(`Unknown staging session: ${sessionId}`);
    }
    return dir;
  }
}
