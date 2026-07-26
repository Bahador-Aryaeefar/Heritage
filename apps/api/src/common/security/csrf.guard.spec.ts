import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

type ContextOverrides = {
  method?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
};

function makeContext(overrides: ContextOverrides) {
  const request = {
    method: overrides.method ?? 'POST',
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as import('@nestjs/common').ExecutionContext;
}

describe('CsrfGuard', () => {
  function makeGuard(skip: boolean) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(skip) } as unknown as Reflector;
    return new CsrfGuard(reflector);
  }

  it('allows safe methods without a token', () => {
    const guard = makeGuard(false);
    expect(guard.canActivate(makeContext({ method: 'GET' }))).toBe(true);
  });

  it('allows routes marked with @SkipCsrf', () => {
    const guard = makeGuard(true);
    expect(guard.canActivate(makeContext({ method: 'POST' }))).toBe(true);
  });

  it('rejects a mutating request with no CSRF cookie', () => {
    const guard = makeGuard(false);
    expect(() =>
      guard.canActivate(makeContext({ method: 'POST', headers: { 'x-csrf-token': 'abc' } })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a mutating request when cookie and header do not match', () => {
    const guard = makeGuard(false);
    expect(() =>
      guard.canActivate(
        makeContext({
          method: 'POST',
          cookies: { heritage_csrf: 'abc' },
          headers: { 'x-csrf-token': 'xyz' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows a mutating request when cookie and header match', () => {
    const guard = makeGuard(false);
    expect(
      guard.canActivate(
        makeContext({
          method: 'POST',
          cookies: { heritage_csrf: 'abc' },
          headers: { 'x-csrf-token': 'abc' },
        }),
      ),
    ).toBe(true);
  });
});
