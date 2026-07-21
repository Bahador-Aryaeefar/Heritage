'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { adminSiteSchema, paginatedResponseSchema } from '@heritage/shared-types';
import type { Locale } from '@/i18n/routing';
import { toContentLocale } from '@/i18n/locales';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { adminFetch, adminFetchVoid } from '@/lib/admin-api';

const sitesSchema = paginatedResponseSchema(adminSiteSchema);

type SitesListProps = {
  labels: {
    title: string;
    newSite: string;
    active: string;
    inactive: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    deleteFailed: string;
    loading: string;
    empty: string;
    ancient: string;
    islamic: string;
    natural: string;
  };
};

export function SitesList({ labels }: SitesListProps) {
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sites'],
    queryFn: () => adminFetch('/admin/sites?page=1&limit=100', sitesSchema),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetchVoid(`/admin/sites/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'sites'] });
    },
    onError: () => setError(labels.deleteFailed),
  });

  const categoryLabel = {
    ANCIENT: labels.ancient,
    ISLAMIC: labels.islamic,
    NATURAL: labels.natural,
  } as const;

  const sites = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">{labels.title}</h1>
        <Link
          href="/admin/sites/new"
          className="inline-flex rounded-button bg-teal-700 px-5 py-2.5 text-[15px] font-bold text-sand-50 transition-transform hover:-translate-y-0.5"
        >
          {labels.newSite}
        </Link>
      </div>

      {isLoading ? <p className="text-[15px] text-brown-600">{labels.loading}</p> : null}
      {!isLoading && sites.length === 0 ? (
        <p className="text-[15px] text-brown-600">{labels.empty}</p>
      ) : null}
      {error ? <p className="text-[15px] text-[#B44B3D]">{error}</p> : null}

      <div className="grid gap-3">
        {sites.map((site) => {
          const contentLocale = toContentLocale(locale);
          const title =
            site.translations.find((t) => t.locale === contentLocale)?.title ??
            site.translations.find((t) => t.locale === 'fa')?.title ??
            site.slug;
          return (
            <div
              key={site.id}
              className="flex flex-wrap items-center gap-4 rounded-card border border-brown-800/15 bg-white p-4"
            >
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-button bg-linear-to-br from-brown-800/20 to-teal-700/25">
                {site.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-brown-950">{title}</div>
                <div className="mt-0.5 text-[13px] text-brown-600" dir="ltr">
                  {site.slug}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{categoryLabel[site.category]}</Badge>
                  <Badge tone={site.isActive ? 'default' : 'muted'}>
                    {site.isActive ? labels.active : labels.inactive}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/sites/${site.id}`}
                  className="inline-flex cursor-pointer items-center justify-center rounded-button border-2 border-brown-800 bg-transparent px-5 py-2.5 text-[15px] font-bold text-brown-800 transition-transform hover:-translate-y-0.5"
                >
                  {labels.edit}
                </Link>
                <ActionButton
                  type="button"
                  variant="ghost"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (!window.confirm(labels.deleteConfirm)) return;
                    deleteMutation.mutate(site.id);
                  }}
                >
                  {labels.delete}
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
