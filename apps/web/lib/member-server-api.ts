import { cookies } from 'next/headers';
import type { ZodType } from 'zod';
import { env } from '@/env';

export async function memberFetchServer<T>(path: string, schema: ZodType<T>): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Member API request failed (${path})`);
  }

  return schema.parse(await response.json());
}
