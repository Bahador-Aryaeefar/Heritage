'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import {
  adminSiteSchema,
  paginatedResponseSchema,
  type SiteCategory,
} from '@heritage/shared-types';
import type { Locale } from '@/i18n/routing';
import { toContentLocale } from '@/i18n/locales';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { CategoryCover } from '@/components/ui/category-cover';
import { TextInput } from '@/components/ui/text-field';
import { ListPagination } from '@/components/admin/list-pagination';
import { adminFetch, adminFetchVoid } from '@/lib/admin-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const sitesSchema = paginatedResponseSchema(adminSiteSchema);
const PAGE_SIZE = 10;

type CategoryCopy = {
  label: string;
  newEntry: string;
  empty: string;
  deleteConfirm: string;
};

type SitesListProps = {
  category: SiteCategory;
  labels: {
    active: string;
    inactive: string;
    edit: string;
    delete: string;
    deleteFailed: string;
    loading: string;
    search: string;
    first: string;
    previous: string;
    next: string;
    last: string;
    category: CategoryCopy;
  };
};

export function SitesList({ category, labels }: SitesListProps) {
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sites', category, page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        category,
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      return adminFetch(`/admin/sites?${params}`, sitesSchema);
    },
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

  const sites = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">
          {labels.category.label}
        </h1>
        <Link
          href={`/admin/sites/new?category=${category}`}
          className="inline-flex rounded-button bg-teal-700 px-5 py-2.5 text-[15px] font-bold text-sand-50 transition-transform hover:-translate-y-0.5"
        >
          {labels.category.newEntry}
        </Link>
      </div>

      <TextInput
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={labels.search}
        aria-label={labels.search}
      />

      {isLoading ? <p className="text-[15px] text-brown-600">{labels.loading}</p> : null}
      {!isLoading && sites.length === 0 ? (
        <p className="text-[15px] text-brown-600">{labels.category.empty}</p>
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
              className="flex items-center gap-4 rounded-card border border-brown-800/15 bg-white p-4 max-md:flex-wrap"
            >
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-button">
                {site.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <CategoryCover category={site.category} />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1">
                <div className="max-w-full truncate text-[15px] font-bold leading-tight text-brown-950">
                  {title}
                </div>
                <Badge tone={site.isActive ? 'default' : 'muted'}>
                  {site.isActive ? labels.active : labels.inactive}
                </Badge>
              </div>
              <div
                className="min-w-0 max-w-[40%] shrink truncate text-[13px] leading-tight text-brown-600"
                dir="ltr"
              >
                {site.slug}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    if (!window.confirm(labels.category.deleteConfirm)) return;
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

      {meta ? (
        <ListPagination
          meta={meta}
          onPageChange={setPage}
          labels={{
            first: labels.first,
            previous: labels.previous,
            next: labels.next,
            last: labels.last,
          }}
        />
      ) : null}
    </div>
  );
}
