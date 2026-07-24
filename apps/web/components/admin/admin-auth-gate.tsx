'use client';

import { useEffect, useState, type ReactNode, Suspense } from 'react';
import { authUserSchema, type AuthUser } from '@heritage/shared-types';
import { AdminShell, type AdminShellCategoryLabels } from '@/components/admin/admin-shell';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { adminFetch } from '@/lib/admin-api';

type AdminAuthGateProps = {
  children: ReactNode;
  loginPath: string;
  labels: {
    users: string;
    logout: string;
    panelTitle: string;
    brandTagline: string;
    roleAdmin: string;
    roleSuperAdmin: string;
    footerTagline: string;
    loading: string;
    categories: AdminShellCategoryLabels;
  };
};

export function AdminAuthGate({ children, loginPath, labels }: AdminAuthGateProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const me = await adminFetch('/auth/me', authUserSchema);
        if (me.role !== 'ADMIN' && me.role !== 'SUPER_ADMIN') {
          window.location.href = loginPath;
          return;
        }
        setUser(me);
      } catch {
        try {
          const refreshedUser = await adminFetch('/auth/refresh', authUserSchema, { method: 'POST' });
          if (refreshedUser.role !== 'ADMIN' && refreshedUser.role !== 'SUPER_ADMIN') {
            window.location.href = loginPath;
            return;
          }
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
    <Suspense fallback={null}>
      <AdminShell user={user} labels={labels}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
