import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  PUBLIC_ASSET_BASE_URL: z.url().default('http://localhost:4000'),
  PUBLIC_WEB_BASE_URL: z.url().default('https://heritage.nobatix.ir'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${result.error.message}`);
  }
  return result.data;
}
