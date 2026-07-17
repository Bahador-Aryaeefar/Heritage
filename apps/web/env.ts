import { z } from 'zod';

// Single validated entry point for environment variables (arch doc §12c).
// No component reads process.env directly - import { env } from '@/env' instead.
// NEXT_PUBLIC_* vars must still be referenced statically to reach the client
// bundle; this object is for server-side code.
const envSchema = z.object({
  API_BASE_URL: z.url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_SITE_URL: z.url().default('https://heritage.nobatix.ir'),
});

export const env = envSchema.parse({
  API_BASE_URL: process.env.API_BASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
