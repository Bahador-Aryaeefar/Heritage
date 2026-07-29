'use client';

import { useQuery } from '@tanstack/react-query';
import { siteVisitStatsSchema } from '@heritage/shared-types';
import { Badge } from '@/components/ui/badge';
import { adminFetch } from '@/lib/admin-api';

export type VisitStatsPanelLabels = {
  title: string;
  totalVisits: string;
  qrVisits: string;
  webVisits: string;
  last30Days: string;
  qrCodes: string;
  active: string;
  inactive: string;
  loading: string;
  error: string;
};

type VisitStatsPanelProps = {
  siteId: string;
  labels: VisitStatsPanelLabels;
};

// Design system: Admin panel section (design-system.md, "Visit stats panel").
// Stat tiles use a documented one-off 22px black number size (see design-system.md
// type scale note) since neither the 15px body size nor the clamp() page-title size
// fit a compact stat tile.
export function VisitStatsPanel({ siteId, labels }: VisitStatsPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'sites', siteId, 'visit-stats'],
    queryFn: () => adminFetch(`/admin/sites/${siteId}/visit-stats`, siteVisitStatsSchema),
  });

  return (
    <section
      aria-labelledby="admin-visit-stats-heading"
      className="rounded-card border border-brown-800/15 bg-white p-5 md:p-6"
    >
      <h2 id="admin-visit-stats-heading" className="text-[15px] font-bold text-brown-950">
        {labels.title}
      </h2>

      {isLoading ? <p className="mt-3 text-[15px] text-brown-600">{labels.loading}</p> : null}
      {isError ? <p className="mt-3 text-[15px] text-[#B44B3D]">{labels.error}</p> : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-button border border-brown-800/15 bg-sand-50 px-3 py-3">
              <div className="text-[22px] font-black text-brown-950">{data.totalVisits}</div>
              <div className="mt-1 text-xs text-brown-600">{labels.totalVisits}</div>
            </div>
            <div className="rounded-button border border-brown-800/15 bg-sand-50 px-3 py-3">
              <div className="text-[22px] font-black text-teal-700">{data.qrVisits}</div>
              <div className="mt-1 text-xs text-brown-600">{labels.qrVisits}</div>
            </div>
            <div className="rounded-button border border-brown-800/15 bg-sand-50 px-3 py-3">
              <div className="text-[22px] font-black text-brown-800">{data.webVisits}</div>
              <div className="mt-1 text-xs text-brown-600">{labels.webVisits}</div>
            </div>
          </div>

          <div>
            <h3 id="admin-visit-stats-last30-heading" className="text-xs font-bold uppercase tracking-wide text-brown-600">
              {labels.last30Days}
            </h3>
            <div className="mt-2 overflow-x-auto">
              <ul
                aria-labelledby="admin-visit-stats-last30-heading"
                className="flex flex-nowrap gap-1"
              >
                {data.last30Days.map((day) => (
                  <li
                    key={day.date}
                    title={`${day.date}: ${day.count}`}
                    aria-label={`${day.date}: ${day.count}`}
                    className="h-6 w-2 shrink-0 rounded-sm bg-teal-700"
                    style={{ opacity: day.count === 0 ? 0.12 : Math.min(1, 0.25 + day.count / 10) }}
                  />
                ))}
              </ul>
            </div>
          </div>

          {data.qrCodes.length > 0 ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-brown-600">
                {labels.qrCodes}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {data.qrCodes.map((qr) => (
                  <li
                    key={qr.code}
                    className="flex items-center justify-between rounded-button border border-brown-800/10 bg-sand-50 px-3 py-2 text-[15px]"
                  >
                    <span dir="ltr" className="truncate text-brown-800">
                      {qr.code}
                    </span>
                    <span className="flex items-center gap-2 text-brown-600">
                      {qr.scanCount}
                      <Badge tone={qr.isActive ? 'default' : 'muted'}>
                        {qr.isActive ? labels.active : labels.inactive}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
