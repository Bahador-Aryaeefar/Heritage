import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  PUBLIC_ASSET_BASE_URL: z.url().default('http://localhost:4000'),
  PUBLIC_WEB_BASE_URL: z.url().default('https://heritage.nobatix.ir'),
  JWT_SECRET: z.string().min(16).default('dev-only-change-me-please'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CORS_ORIGIN: z.url().default('http://localhost:3000'),
  // Number of reverse-proxy hops in front of the API that are trusted to set
  // X-Forwarded-For (Express `trust proxy` hop count). Default 0 means "no
  // proxy, trust only the direct TCP peer" - safe for local dev, where
  // connections are direct. In production behind Caddy (architecture-decisions
  // §16), set this to the number of hops Caddy adds (1) so `req.ip` resolves
  // to the real client instead of the reverse-proxy address. Never set this to
  // an untrusted blanket value: a wrong (too high) hop count lets a client
  // spoof X-Forwarded-For and evade the auth rate limits.
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${result.error.message}`);
  }
  return result.data;
}
