import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type {
  AdminUser,
  CreateUserInput,
  PaginatedResponse,
  UpdateUserInput,
  UpdateUserPasswordInput,
} from '@heritage/shared-types';
import { handlePrismaError } from '../../common/filters/handle-prisma-error';
import { normalizePagination, paginatedResponse } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<AdminUser>> {
    const pagination = normalizePagination(query);
    const search = query.search?.trim();
    const staffRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    const where = {
      role: { in: staffRoles },
      ...(search
        ? {
            OR: [
              { phone: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { displayName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [users, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginatedResponse(
      users.map((user) => this.toAdminUser(user)),
      totalItems,
      pagination,
    );
  }

  async createUser(input: CreateUserInput): Promise<AdminUser> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: {
          phone: input.phone,
          passwordHash,
          role: input.role,
          displayName: input.displayName ?? null,
        },
      });
      return this.toAdminUser(user);
    } catch (error) {
      handlePrismaError(error, 'User');
    }
  }

  async updateUser(id: string, input: UpdateUserInput, actorId: string): Promise<AdminUser> {
    const existing = await this.requireStaffUser(id);

    if (input.isActive === false && existing.role === UserRole.SUPER_ADMIN) {
      await this.assertNotLastSuperAdmin(existing.id);
    }

    if (input.role && input.role !== 'SUPER_ADMIN' && existing.role === UserRole.SUPER_ADMIN) {
      if (existing.id === actorId) {
        throw new ForbiddenException('You cannot demote yourself');
      }
      await this.assertNotLastSuperAdmin(existing.id);
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          role: input.role,
          displayName: input.displayName,
          isActive: input.isActive,
        },
      });

      if (input.isActive === false) {
        await this.authService.revokeAllUserTokens(user.id);
      }

      return this.toAdminUser(user);
    } catch (error) {
      handlePrismaError(error, 'User');
    }
  }

  async updatePassword(id: string, input: UpdateUserPasswordInput): Promise<void> {
    await this.requireStaffUser(id);
    const passwordHash = await bcrypt.hash(input.password, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    await this.authService.revokeAllUserTokens(id);
  }

  async deleteUser(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new ForbiddenException('You cannot delete yourself');
    }

    const existing = await this.requireStaffUser(id);
    if (existing.role === UserRole.SUPER_ADMIN) {
      await this.assertNotLastSuperAdmin(existing.id);
    }

    await this.authService.revokeAllUserTokens(id);
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      handlePrismaError(error, 'User');
    }
  }

  private async requireStaffUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role === UserRole.MEMBER) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async assertNotLastSuperAdmin(userId: string): Promise<void> {
    const activeSuperAdmins = await this.prisma.user.count({
      where: { role: UserRole.SUPER_ADMIN, isActive: true, id: { not: userId } },
    });
    if (activeSuperAdmins === 0) {
      throw new BadRequestException('Cannot remove or deactivate the last super admin');
    }
  }

  private toAdminUser(user: {
    id: string;
    phone: string | null;
    email: string | null;
    role: UserRole;
    displayName: string | null;
    isActive: boolean;
    createdAt: Date;
  }): AdminUser {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role as AdminUser['role'],
      displayName: user.displayName,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
