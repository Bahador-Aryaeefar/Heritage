import { z } from 'zod';

// Single validated entry point for environment variables (arch doc §12c).
// Values are loaded from the monorepo root `.env` (see next.config.ts + @heritage/env-loader).
const envSchema = z.object({
  API_BASE_URL: z.url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_SITE_URL: z.url().default('https://heritage.nobatix.ir'),
  NEXT_PUBLIC_MAP_IR_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  API_BASE_URL: process.env.API_BASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_MAP_IR_API_KEY: process.env.NEXT_PUBLIC_MAP_IR_API_KEY,
});
