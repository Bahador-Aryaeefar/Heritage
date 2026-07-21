import type { Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './auth.constants';

type CookieOptions = {
  secure: boolean;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  options: CookieOptions,
): void {
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: options.secure,
  };

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    maxAge: options.accessMaxAgeMs,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    maxAge: options.refreshMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
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
