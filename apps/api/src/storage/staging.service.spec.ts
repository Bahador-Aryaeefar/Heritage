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
  let saveImage: jest.Mock<Promise<StoredFile>, [string, Buffer, string]>;
  let storage: StorageService;
  let service: StagingService;

  beforeEach(() => {
    saveImage = jest.fn(async (siteId: string, _buffer: Buffer, filenameBase: string) => ({
      url: `/uploads/sites/${siteId}/images/${filenameBase}.webp`,
      mimeType: 'image/webp',
    }));
    storage = {
      saveImage,
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

  it('promoteImage reads the staged buffer and delegates to storage.saveImage', async () => {
    const { sessionId } = service.createSession();
    await service.write(sessionId, 'cover.png', Buffer.from('raw-bytes'));

    const stored = await service.promoteImage(sessionId, 'cover.png', 'site-123', 'cover');

    expect(saveImage).toHaveBeenCalledWith('site-123', Buffer.from('raw-bytes'), 'cover');
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
