import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('AuthService login lockout', () => {
  const passwordHash = bcrypt.hashSync('CorrectPassword123!', 4);
  const baseUser = {
    id: 'user1',
    phone: null,
    email: 'member@example.com',
    passwordHash,
    displayName: 'Member',
    role: 'MEMBER' as const,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
  };

  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        COOKIE_SECURE: false,
      };
      return values[key];
    }),
  };

  const res = { cookie: jest.fn() };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ ...baseUser });
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService<Record<string, unknown>, true>,
    );
  });

  it('rejects a wrong password and increments failedLoginAttempts', async () => {
    await expect(
      service.login('member@example.com', 'WrongPassword', res as unknown as Parameters<AuthService['login']>[2]),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { failedLoginAttempts: 1, lockedUntil: null },
    });
  });

  it('locks the account after the 5th consecutive failed attempt', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 4 });

    await expect(
      service.login('member@example.com', 'WrongPassword', res as unknown as Parameters<AuthService['login']>[2]),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { failedLoginAttempts: 0, lockedUntil: expect.any(Date) as Date },
    });
  });

  it('rejects a correct password while the account is locked', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login(
        'member@example.com',
        'CorrectPassword123!',
        res as unknown as Parameters<AuthService['login']>[2],
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('resets failedLoginAttempts on a successful login', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 3 });

    await service.login(
      'member@example.com',
      'CorrectPassword123!',
      res as unknown as Parameters<AuthService['login']>[2],
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });
});
