import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256Hex } from '../common/crypto/sha256';
import type { StorageService, StoredFile } from './storage.interface';
import { StagingService } from './staging.service';

describe('sha256Hex', () => {
  it('matches node crypto', () => {
    const buf = Buffer.from('heritage');
    expect(sha256Hex(buf)).toBe(createHash('sha256').update(buf).digest('hex'));
  });
});

describe('StagingService', () => {
  let processImage: jest.Mock<Promise<Buffer>, [Buffer]>;
  let saveProcessedImage: jest.Mock<Promise<StoredFile>, [string, Buffer, string]>;
  let storage: StorageService;
  let service: StagingService;

  beforeEach(() => {
    processImage = jest.fn((buffer: Buffer) =>
      Promise.resolve(Buffer.concat([Buffer.from('webp:'), buffer])),
    );
    saveProcessedImage = jest.fn((siteId: string, _buffer: Buffer, filenameBase: string) =>
      Promise.resolve({
        url: `/uploads/sites/${siteId}/images/${filenameBase}.webp`,
        mimeType: 'image/webp',
      }),
    );
    storage = {
      processImage,
      saveProcessedImage,
      saveImage: jest.fn(),
      saveBinary: jest.fn(),
      deleteByUrl: jest.fn(),
      toAbsoluteUrl: jest.fn((url: string) => url),
    };
    service = new StagingService(storage);
  });

  it('creates a session directory under the heritage-stage tmp root', () => {
    const { sessionId, dir } = service.createSession();

    expect(sessionId).toBeTruthy();
    expect(dir).toContain('heritage-stage');
    expect(dir.endsWith(sessionId)).toBe(true);
    expect(existsSync(dir)).toBe(true);
  });

  it('writes a buffer to the session dir and returns its absolute path', async () => {
    const { sessionId, dir } = service.createSession();
    const path = await service.write(sessionId, 'photo.bin', Buffer.from('hello'));

    expect(path).toBe(join(dir, 'photo.bin'));
    expect(await readFile(path, 'utf8')).toBe('hello');
  });

  it('stageImage optimizes the raw upload with Sharp before writing to the session dir', async () => {
    const { sessionId, dir } = service.createSession();

    const path = await service.stageImage(sessionId, 'cover.png', Buffer.from('raw-bytes'));

    expect(processImage).toHaveBeenCalledWith(Buffer.from('raw-bytes'));
    expect(path).toBe(join(dir, 'cover.png'));
    // The *optimized* bytes are what land in staging, not the raw upload.
    expect(await readFile(path)).toEqual(Buffer.from('webp:raw-bytes'));
  });

  it('promoteImage copies the already-optimized staged bytes without re-encoding', async () => {
    const { sessionId } = service.createSession();
    await service.stageImage(sessionId, 'cover.png', Buffer.from('raw-bytes'));

    const stored = await service.promoteImage(sessionId, 'cover.png', 'site-123', 'cover');

    expect(saveProcessedImage).toHaveBeenCalledWith(
      'site-123',
      Buffer.from('webp:raw-bytes'),
      'cover',
    );
    expect(stored).toEqual({ url: '/uploads/sites/site-123/images/cover.webp', mimeType: 'image/webp' });
  });

  it('abort deletes the session directory', async () => {
    const { sessionId, dir } = service.createSession();
    await service.write(sessionId, 'photo.bin', Buffer.from('hello'));
    expect(existsSync(dir)).toBe(true);

    await service.abort(sessionId);

    expect(existsSync(dir)).toBe(false);
  });

  it('cleanup deletes the session directory', async () => {
    const { sessionId, dir } = service.createSession();
    await service.write(sessionId, 'photo.bin', Buffer.from('hello'));

    await service.cleanup(sessionId);

    expect(existsSync(dir)).toBe(false);
  });

  it('write throws for an unknown session', async () => {
    await expect(service.write('missing-session', 'a.bin', Buffer.from('x'))).rejects.toThrow(
      /unknown staging session/i,
    );
  });
});
