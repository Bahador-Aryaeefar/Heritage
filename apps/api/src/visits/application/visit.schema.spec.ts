import { recordVisitSchema, siteVisitStatsSchema } from '@heritage/shared-types';

describe('recordVisitSchema', () => {
  it('accepts a QR visit with a supported locale', () => {
    expect(() => recordVisitSchema.parse({ source: 'QR', locale: 'fa' })).not.toThrow();
  });

  it('rejects an unknown source', () => {
    expect(() => recordVisitSchema.parse({ source: 'APP', locale: 'fa' })).toThrow();
  });

  it('rejects an unsupported locale', () => {
    expect(() => recordVisitSchema.parse({ source: 'WEB', locale: 'de' })).toThrow();
  });
});

describe('siteVisitStatsSchema', () => {
  it('accepts a full stats payload', () => {
    expect(() =>
      siteVisitStatsSchema.parse({
        totalVisits: 12,
        qrVisits: 8,
        webVisits: 4,
        last30Days: [{ date: '2026-07-01', count: 2 }],
        qrCodes: [{ code: 'taq-e-bostan-ab12', isActive: true, scanCount: 8 }],
      }),
    ).not.toThrow();
  });
});
