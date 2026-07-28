import type { ExecutionContext } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Request } from 'express';
import { rootEnvFilePath } from '@heritage/env-loader';
import type { Env } from './config/env';
import { validateEnv } from './config/env';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { PrismaModule } from './prisma/prisma.module';
import { SitesModule } from './sites/sites.module';
import { StorageModule } from './storage/storage.module';
import { CsrfGuard } from './common/security/csrf.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: existsSync(rootEnvFilePath()) ? rootEnvFilePath() : undefined,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const trustProxyHops = config.getOrThrow<number>('TRUST_PROXY');
        return [
          {
            name: 'default',
            ttl: 60_000,
            limit: 60,
            // Without a trusted proxy hop, every client (browser or SSR
            // container-to-container fetch) is bucketed under the same
            // address, turning this per-client limit into a site-wide cap.
            // Once TRUST_PROXY > 0, a request that still has no
            // X-Forwarded-For header did not come through the proxy (it's
            // an internal call, e.g. the web container's own SSR fetches
            // to the API), so there is no distinguishable client to bucket
            // by; skip the blanket default for it rather than throttling
            // all such traffic together. Explicit `@Throttle(...)` routes
            // (auth, review writes, likes, qr.png) are unaffected: real
            // attackers can only reach this API through Caddy, which
            // always sets X-Forwarded-For, so their requests are never
            // skipped here.
            skipIf: (context: ExecutionContext) => {
              if (trustProxyHops === 0) return false;
              const request = context.switchToHttp().getRequest<Request>();
              return !request.headers['x-forwarded-for'];
            },
          },
        ];
      },
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const uploadDir = resolve(process.cwd(), config.getOrThrow('UPLOAD_DIR'));
        return [
          {
            rootPath: uploadDir,
            serveRoot: '/uploads',
            serveStaticOptions: { index: false },
          },
        ];
      },
    }),
    PrismaModule,
    StorageModule,
    MediaModule,
    HealthModule,
    AuthModule,
    SitesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
