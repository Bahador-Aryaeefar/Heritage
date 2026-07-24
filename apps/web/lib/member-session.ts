import { cookies } from 'next/headers';
import { authUserSchema, type AuthUser } from '@heritage/shared-types';
import { env } from '@/env';

export async function getMemberSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    if (!cookieHeader) return null;

    const response = await fetch(`${env.API_BASE_URL}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const user = authUserSchema.parse(await response.json());
    if (user.role !== 'MEMBER') {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}
