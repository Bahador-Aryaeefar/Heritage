import type { ZodType } from 'zod';
import { isMutatingMethod, readCsrfToken } from '@/lib/csrf';

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function adminFetch<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const request = () =>
    fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(isMutatingMethod(init?.method) ? { 'X-CSRF-Token': readCsrfToken() ?? '' } : {}),
        ...init?.headers,
      },
    });

  let response = await request();
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await request();
    }
  }

  if (!response.ok) {
    throw new AdminApiError(`API request failed (${path})`, response.status);
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }

  return schema.parse(await response.json());
}

export async function adminFetchVoid(path: string, init?: RequestInit): Promise<void> {
  const request = () =>
    fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(isMutatingMethod(init?.method) ? { 'X-CSRF-Token': readCsrfToken() ?? '' } : {}),
        ...init?.headers,
      },
    });

  let response = await request();
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await request();
    }
  }

  if (!response.ok) {
    throw new AdminApiError(`API request failed (${path})`, response.status);
  }
}
