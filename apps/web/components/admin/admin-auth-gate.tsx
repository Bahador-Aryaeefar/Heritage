'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { authUserSchema, type AuthUser } from '@heritage/shared-types';
import { AdminShell } from '@/components/admin/admin-shell';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { adminFetch } from '@/lib/admin-api';

type AdminAuthGateProps = {
  children: ReactNode;
  loginPath: string;
  labels: {
    sites: string;
    users: string;
    logout: string;
    panelTitle: string;
    brandTagline: string;
    roleAdmin: string;
    roleSuperAdmin: string;
    footerTagline: string;
    loading: string;
  };
};

export function AdminAuthGate({ children, loginPath, labels }: AdminAuthGateProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const me = await adminFetch('/auth/me', authUserSchema);
        setUser(me);
      } catch {
        try {
          const refreshedUser = await adminFetch('/auth/refresh', authUserSchema, { method: 'POST' });
          setUser(refreshedUser);
        } catch {
          window.location.href = loginPath;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loginPath]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center text-brown-600">
        <HeritagePageBackground />
        <span className="relative">{labels.loading}</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminShell user={user} labels={labels}>
      {children}
    </AdminShell>
  );
}
