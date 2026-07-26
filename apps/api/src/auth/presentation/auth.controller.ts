import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  authUserSchema,
  createUserSchema,
  loginSchema,
  registerSchema,
  updateMemberProfileSchema,
  updateUserPasswordSchema,
  updateUserSchema,
} from '@heritage/shared-types';
import { REFRESH_COOKIE } from '../auth.constants';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import type { AuthenticatedUser } from '../roles.decorator';
import { AuthService } from '../application/auth.service';
import { UsersService } from '../application/users.service';
import { SiteReviewsService } from '../../sites/application/site-reviews.service';
import { AdminUsersListQueryDto } from './admin-users-list.query';
import { MemberReviewsListQueryDto } from './member-reviews-list.query';
import {
  ADMIN_USER_EXAMPLE,
  ADMIN_USER_SCHEMA,
  AUTH_USER_EXAMPLE,
  AUTH_USER_SCHEMA,
  CREATE_USER_BODY_SCHEMA,
  LOGIN_BODY_SCHEMA,
  OK_SCHEMA,
  UPDATE_PASSWORD_BODY_SCHEMA,
  UPDATE_USER_BODY_SCHEMA,
  ApiJsonBody,
  ApiJsonCreated,
  ApiJsonOk,
  ApiNoContent,
  ApiPaginatedResponse,
  ApiProtectedErrors,
  ApiValidationError,
  MEMBER_REVIEW_EXAMPLE,
  MEMBER_REVIEW_SCHEMA,
  REGISTER_BODY_SCHEMA,
  UPDATE_MEMBER_PROFILE_BODY_SCHEMA,
} from '../../common/openapi/openapi';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly siteReviewsService: SiteReviewsService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiJsonCreated('Create a public member account', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
  @ApiJsonBody(REGISTER_BODY_SCHEMA, {
    displayName: 'Sara Member',
    email: 'sara@example.com',
    password: 'StrongPassword123!',
  })
  @ApiValidationError()
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = registerSchema.parse(body);
    const user = await this.authService.register(input, res);
    return authUserSchema.parse(user);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiJsonOk('Sign in with email or phone and password', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
  @ApiJsonBody(LOGIN_BODY_SCHEMA, {
    identifier: '09120086846',
    password: 'StrongPassword123!',
  })
  @ApiValidationError()
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const input = loginSchema.parse(body);
    const user = await this.authService.login(input.identifier, input.password, res);
    return authUserSchema.parse(user);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiCookieAuth('heritage_refresh')
  @ApiJsonOk('Rotate the refresh token and issue a new token pair', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const user = await this.authService.refresh(refreshToken, res);
    return authUserSchema.parse(user);
  }

  @Post('logout')
  @ApiCookieAuth('heritage_refresh')
  @ApiJsonOk('Revoke the current refresh token and clear auth cookies', OK_SCHEMA, { ok: true })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(refreshToken, res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('heritage_access')
  @ApiJsonOk('Get the current authenticated user', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
  @ApiProtectedErrors()
  async me(@Req() req: Request & { user: AuthenticatedUser }) {
    const user = await this.authService.getMe(req.user.id);
    return authUserSchema.parse(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('heritage_access')
  @ApiJsonOk('Update the current member profile', AUTH_USER_SCHEMA, AUTH_USER_EXAMPLE)
  @ApiJsonBody(UPDATE_MEMBER_PROFILE_BODY_SCHEMA, {
    displayName: 'Sara Member',
    email: 'sara@example.com',
    phone: '09121234567',
  })
  @ApiValidationError()
  @ApiProtectedErrors()
  async updateMe(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = updateMemberProfileSchema.parse(body);
    const user = await this.authService.updateMemberProfile(req.user.id, input, res);
    return authUserSchema.parse(user);
  }

  @Get('me/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('heritage_access')
  @ApiPaginatedResponse('List reviews written by the current member', MEMBER_REVIEW_SCHEMA, MEMBER_REVIEW_EXAMPLE)
  @ApiProtectedErrors()
  listMyReviews(
    @Req() req: Request & { user: AuthenticatedUser },
    @Query() query: MemberReviewsListQueryDto,
  ) {
    return this.siteReviewsService.listForMember(req.user.id, query.locale, query);
  }
}

@ApiTags('admin-users')
@ApiCookieAuth('heritage_access')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiPaginatedResponse('List users', ADMIN_USER_SCHEMA, ADMIN_USER_EXAMPLE)
  @ApiProtectedErrors()
  list(@Query() query: AdminUsersListQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Post()
  @ApiJsonCreated('Create an admin user', ADMIN_USER_SCHEMA, ADMIN_USER_EXAMPLE)
  @ApiJsonBody(CREATE_USER_BODY_SCHEMA, {
    phone: '09121234567',
    password: 'StrongPassword123!',
    role: 'ADMIN',
    displayName: 'Site editor',
  })
  @ApiValidationError()
  @ApiProtectedErrors()
  create(@Body() body: unknown) {
    return this.usersService.createUser(createUserSchema.parse(body));
  }

  @Patch(':id')
  @ApiJsonOk('Update an admin user', ADMIN_USER_SCHEMA, ADMIN_USER_EXAMPLE)
  @ApiJsonBody(UPDATE_USER_BODY_SCHEMA, {
    role: 'ADMIN',
    displayName: 'Senior editor',
    isActive: true,
  })
  @ApiValidationError()
  @ApiProtectedErrors()
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.usersService.updateUser(id, updateUserSchema.parse(body), req.user.id);
  }

  @Patch(':id/password')
  @ApiJsonOk('Change a user password and revoke their sessions', OK_SCHEMA, { ok: true })
  @ApiJsonBody(UPDATE_PASSWORD_BODY_SCHEMA, { password: 'NewStrongPassword123!' })
  @ApiValidationError()
  @ApiProtectedErrors()
  updatePassword(@Param('id') id: string, @Body() body: unknown) {
    return this.usersService.updatePassword(id, updateUserPasswordSchema.parse(body)).then(() => ({ ok: true }));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContent('Delete an admin user (revokes sessions; cannot delete self or last super admin)')
  @ApiProtectedErrors()
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<void> {
    await this.usersService.deleteUser(id, req.user.id);
  }
}
