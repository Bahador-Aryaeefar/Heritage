import type { ZodType } from 'zod';
import { env } from '@/env';

// Non-2xx responses throw this instead of a bare Error so callers can tell
// "the resource does not exist" (404 → notFound()) apart from transient
// failures (network, 5xx), which must NOT be rendered as a 404: during ISR
// revalidation a thrown error keeps serving the last good page, while
// notFound() would replace a working page with a 404.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`API request failed: ${status} (${path})`);
    this.name = 'ApiError';
  }
}

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
    throw new ApiError(response.status, path);
  }
  return schema.parse(await response.json());
}
