import type { ZodType } from 'zod';
import { env } from '@/env';

// Typed fetch wrapper (arch doc §12b). Every response is parsed through the
// matching Zod schema at the boundary so a backend contract change fails
// loudly in development instead of leaking `undefined` into components (§12a).
export async function apiFetch<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${env.API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText} (${path})`);
  }
  return schema.parse(await response.json());
}
