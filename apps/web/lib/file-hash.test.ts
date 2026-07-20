/**
 * @vitest-environment node
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256HexOfFile } from './file-hash';

describe('sha256HexOfFile', () => {
  it('matches Node crypto for known bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([bytes]);
    const expected = createHash('sha256').update(bytes).digest('hex');
    await expect(sha256HexOfFile(blob)).resolves.toBe(expected);
  });

  it('is deterministic for the same blob content', async () => {
    const blob = new Blob(['hello heritage']);
    const first = await sha256HexOfFile(blob);
    const second = await sha256HexOfFile(blob);
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });

  it('differs when byte content differs', async () => {
    const a = await sha256HexOfFile(new Blob(['a']));
    const b = await sha256HexOfFile(new Blob(['b']));
    expect(a).not.toBe(b);
  });
});
