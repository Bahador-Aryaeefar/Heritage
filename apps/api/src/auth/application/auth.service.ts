import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthUser, RegisterInput, UpdateMemberProfileInput } from '@heritage/shared-types';
import type { Env } from '../../config/env';
import { handlePrismaError } from '../../common/filters/handle-prisma-error';
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

  async register(input: RegisterInput, res: Response): Promise<AuthUser> {
    const email = input.email?.trim().toLowerCase() ?? null;
    const phone = input.phone?.trim() ?? null;
    if (!email && !phone) {
      throw new ConflictException('Email or phone is required');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: {
          displayName: input.displayName.trim(),
          passwordHash,
          email,
          phone,
          role: UserRole.MEMBER,
        },
      });
      await this.issueAuthPair(user, res, generateFamilyId());
      return this.toAuthUser(user);
    } catch (error) {
      handlePrismaError(error, 'User');
    }
  }

  async login(identifier: string, password: string, res: Response): Promise<AuthUser> {
    const user = await this.findByIdentifier(identifier);
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

  async updateMemberProfile(
    userId: string,
    input: UpdateMemberProfileInput,
    res?: Response,
  ): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can update this profile');
    }

    const data: {
      displayName: string;
      email: string | null;
      phone: string | null;
      passwordHash?: string;
    } = {
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
    };

    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 12);
      await this.revokeAllUserTokens(userId);
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
      if (input.password && res) {
        await this.issueAuthPair(updated, res, generateFamilyId());
      }
      return this.toAuthUser(updated);
    } catch (error) {
      handlePrismaError(error, 'User');
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async findByIdentifier(identifier: string): Promise<User | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    if (trimmed.includes('@')) {
      return this.prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } });
    }
    return this.prisma.user.findUnique({ where: { phone: trimmed } });
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
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    };
  }
}
