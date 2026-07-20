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

  async promoteImage(
    sessionId: string,
    fileName: string,
    siteId: string,
    filenameBase: string,
  ): Promise<StoredFile> {
    const dir = this.requireDir(sessionId);
    const buffer = await readFile(join(dir, fileName));
    return this.storage.saveImage(siteId, buffer, filenameBase);
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
