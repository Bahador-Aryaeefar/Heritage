import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Env } from '../config/env';
import { ACCESS_COOKIE } from './auth.constants';
import type { AuthenticatedUser } from './roles.decorator';

type JwtPayload = {
  sub: string;
  role: AuthenticatedUser['role'];
};

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);
    if (!token) {
      return true;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      });
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      /* ignore invalid token for optional auth */
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const cookieToken = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (cookieToken) return cookieToken;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
