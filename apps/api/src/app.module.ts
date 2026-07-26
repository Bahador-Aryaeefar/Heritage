import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
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
