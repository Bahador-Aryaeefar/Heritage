import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisitStatsPanel, type VisitStatsPanelLabels } from './visit-stats-panel';

const { adminFetchMock } = vi.hoisted(() => ({ adminFetchMock: vi.fn() }));

vi.mock('@/lib/admin-api', () => ({
  adminFetch: adminFetchMock,
}));

afterEach(() => {
  cleanup();
  adminFetchMock.mockReset();
});

const labels: VisitStatsPanelLabels = {
  title: 'Visit statistics',
  totalVisits: 'Total visits',
  qrVisits: 'Via QR',
  webVisits: 'Via web',
  last30Days: 'Last 30 days',
  qrCodes: 'QR codes',
  active: 'Active',
  inactive: 'Inactive',
  loading: 'Loading visit statistics...',
  error: 'Could not load visit statistics.',
};

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('VisitStatsPanel', () => {
  it('shows the loading copy before the query resolves', () => {
    adminFetchMock.mockReturnValue(new Promise(() => {}));

    renderWithClient(<VisitStatsPanel siteId="site-1" labels={labels} />);

    expect(screen.getByText('Loading visit statistics...')).toBeInTheDocument();
  });

  it('shows the error copy when the query fails', async () => {
    adminFetchMock.mockRejectedValue(new Error('boom'));

    renderWithClient(<VisitStatsPanel siteId="site-1" labels={labels} />);

    await waitFor(() =>
      expect(screen.getByText('Could not load visit statistics.')).toBeInTheDocument(),
    );
  });

  it('renders totals and QR-code rows with the correct badge tone once loaded', async () => {
    adminFetchMock.mockResolvedValue({
      totalVisits: 42,
      qrVisits: 30,
      webVisits: 12,
      last30Days: [
        { date: '2026-07-01', count: 0 },
        { date: '2026-07-02', count: 5 },
      ],
      qrCodes: [
        { code: 'QR-ACTIVE', isActive: true, scanCount: 20 },
        { code: 'QR-INACTIVE', isActive: false, scanCount: 10 },
      ],
    });

    renderWithClient(<VisitStatsPanel siteId="site-1" labels={labels} />);

    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    expect(screen.getByText('QR-ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('QR-INACTIVE')).toBeInTheDocument();
    expect(screen.getAllByText(/Active|Inactive/)).toHaveLength(2);

    const activeBadge = screen.getByText('Active');
    const inactiveBadge = screen.getByText('Inactive');
    expect(activeBadge.className).toContain('bg-teal-200');
    expect(inactiveBadge.className).toContain('bg-brown-800/10');

    expect(adminFetchMock).toHaveBeenCalledWith(
      '/admin/sites/site-1/visit-stats',
      expect.anything(),
    );
  });

  it('gives each day of the last-30-days strip an accessible name with date and count', async () => {
    adminFetchMock.mockResolvedValue({
      totalVisits: 5,
      qrVisits: 3,
      webVisits: 2,
      last30Days: [
        { date: '2026-07-01', count: 0 },
        { date: '2026-07-02', count: 5 },
      ],
      qrCodes: [],
    });

    renderWithClient(<VisitStatsPanel siteId="site-1" labels={labels} />);

    expect(await screen.findByLabelText('2026-07-01: 0')).toBeInTheDocument();
    expect(screen.getByLabelText('2026-07-02: 5')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Last 30 days' })).toBeInTheDocument();
  });

  it('hides the QR codes subsection when there are no QR codes', async () => {
    adminFetchMock.mockResolvedValue({
      totalVisits: 0,
      qrVisits: 0,
      webVisits: 0,
      last30Days: [],
      qrCodes: [],
    });

    renderWithClient(<VisitStatsPanel siteId="site-1" labels={labels} />);

    await waitFor(() => expect(screen.getAllByText('0').length).toBeGreaterThan(0));
    expect(screen.queryByText('QR codes')).not.toBeInTheDocument();
  });
});
