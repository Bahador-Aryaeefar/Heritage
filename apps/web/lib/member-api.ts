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

export class MemberApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'MemberApiError';
  }
}

export async function memberFetch<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  if (isMutatingMethod(init?.method) && !readCsrfToken()) {
    // A still-valid access cookie from before a deploy (or before this
    // session ever hit a route that mints heritage_csrf) means no CSRF
    // cookie exists yet. It never 401s, so the wrapper would never retry on
    // its own; mint one via refresh before sending the mutation.
    await refreshSession();
  }

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
    throw new MemberApiError(`API request failed (${path})`, response.status);
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }

  return schema.parse(await response.json());
}

export async function memberFetchVoid(path: string, init?: RequestInit): Promise<void> {
  if (isMutatingMethod(init?.method) && !readCsrfToken()) {
    await refreshSession();
  }

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
    throw new MemberApiError(`API request failed (${path})`, response.status);
  }
}
