import type { Response } from 'express';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from './auth.constants';

type CookieOptions = {
  secure: boolean;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string,
  options: CookieOptions,
): void {
  const base = {
    sameSite: 'lax' as const,
    path: '/',
    secure: options.secure,
  };

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    httpOnly: true,
    maxAge: options.accessMaxAgeMs,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: options.refreshMaxAgeMs,
  });

  // Not httpOnly: the frontend reads this cookie and mirrors it into the
  // X-CSRF-Token header on every mutating request (double-submit pattern).
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...base,
    httpOnly: false,
    maxAge: options.refreshMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match?.[1] || !match[2]) return fallbackMs;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 1000);
}
