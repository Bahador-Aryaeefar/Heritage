import { describe, expect, it } from 'vitest';
import { memberReviewsResponseSchema } from '@/lib/reviews';

// Regression guard: this schema is consumed by the /profile Server Component.
// It previously lived in member-reviews-list.tsx, a 'use client' module, so on
// the server the import resolved to a client-reference stub and `.parse` threw
// "is not a function", 500ing the page. Keeping it in a server-safe lib module
// is what makes it a real Zod schema on both sides of the boundary.
describe('memberReviewsResponseSchema', () => {
  it('is a usable Zod schema, not a client-reference stub', () => {
    expect(typeof memberReviewsResponseSchema.parse).toBe('function');
  });

  it('parses an empty paginated member-review payload', () => {
    const parsed = memberReviewsResponseSchema.parse({
      items: [],
      meta: {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    expect(parsed.items).toEqual([]);
    expect(parsed.meta.totalItems).toBe(0);
  });

  it('parses a populated member-review payload', () => {
    const parsed = memberReviewsResponseSchema.parse({
      items: [
        {
          id: 'rev1',
          body: 'Great heritage site.',
          likeCount: 2,
          updatedAt: '2026-07-25T12:00:00.000Z',
          siteSlug: 'taq-e-bostan',
          siteTitle: 'Taq-e Bostan',
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    expect(parsed.items[0]?.siteSlug).toBe('taq-e-bostan');
  });
});
