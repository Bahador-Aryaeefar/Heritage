import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // GlobalExceptionFilter and PrismaExceptionFilter are registered as
  // APP_FILTER providers in AppModule so production and e2e tests (which
  // build the app from AppModule directly) share one configuration.

  const config = app.get(ConfigService<Env, true>);

  // Trust the operator-configured number of reverse-proxy hops so `req.ip`
  // (and the rate limiter's per-client bucketing) reflects the real client
  // behind Caddy instead of the proxy's own address. See TRUST_PROXY in
  // config/env.ts and architecture-decisions.md §25.
  const trustProxyHops: number = config.getOrThrow('TRUST_PROXY');
  app.set('trust proxy', trustProxyHops);

  const corsOrigin: string = config.getOrThrow('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const openApiConfig = new DocumentBuilder()
    .setTitle('Shahrnama API')
    .setDescription('Public content API and admin endpoints')
    .setVersion('1.0')
    // Paths already include `/api/v1/...` (global prefix + URI versioning).
    // Server must be host root — `/api/v1` here would double the prefix in Scalar.
    .addServer('/', 'Current host')
    .addCookieAuth('heritage_access')
    .addCookieAuth('heritage_refresh')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);

  app.use('/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  app.use(
    '/docs',
    apiReference({
      theme: 'default',
      darkMode: true,
      forceDarkModeState: 'dark',
      content: document,
    }),
  );

  await app.listen(config.getOrThrow<number>('PORT'));
}
void bootstrap();
