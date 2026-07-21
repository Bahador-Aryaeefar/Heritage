import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthUser } from '@heritage/shared-types';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { clearAuthCookies, parseDurationMs, setAuthCookies } from '../auth.cookies';
import { generateFamilyId, generateOpaqueToken, hashRefreshToken } from '../auth.tokens';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(phone: string, password: string, res: Response): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.issueAuthPair(user, res, generateFamilyId());
    return this.toAuthUser(user);
  }

  async refresh(refreshToken: string | undefined, res: Response): Promise<AuthUser> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.revokeTokenFamily(existing.familyId);
      clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!existing.user.isActive) {
      await this.revokeAllUserTokens(existing.userId);
      clearAuthCookies(res);
      throw new UnauthorizedException('User is inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    await this.issueAuthPair(existing.user, res, existing.familyId);
    return this.toAuthUser(existing.user);
  }

  async logout(refreshToken: string | undefined, res: Response): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (existing && !existing.revokedAt) {
        await this.prisma.refreshToken.update({
          where: { id: existing.id },
          data: { revokedAt: new Date() },
        });
      }
    }
    clearAuthCookies(res);
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueAuthPair(user: User, res: Response, familyId: string): Promise<void> {
    const jwtSecret: string = this.config.getOrThrow('JWT_SECRET');
    const accessExpiresIn: string = this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN');
    const refreshExpiresIn: string = this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN');
    const cookieSecure: boolean = this.config.getOrThrow('COOKIE_SECURE');

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: jwtSecret,
        expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const opaqueRefresh = generateOpaqueToken();
    const refreshMaxAgeMs = parseDurationMs(refreshExpiresIn, 7 * 86_400_000);
    const expiresAt = new Date(Date.now() + refreshMaxAgeMs);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(opaqueRefresh),
        familyId,
        expiresAt,
      },
    });

    const accessMaxAgeMs = parseDurationMs(accessExpiresIn, 15 * 60_000);

    setAuthCookies(res, accessToken, opaqueRefresh, {
      secure: cookieSecure,
      accessMaxAgeMs,
      refreshMaxAgeMs,
    });
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      displayName: user.displayName,
    };
  }
}
