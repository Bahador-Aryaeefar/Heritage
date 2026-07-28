import {
  memberReviewSchema,
  paginatedResponseSchema,
  siteReviewSchema,
  type MemberReview,
  type PaginatedResponse,
  type SiteReview,
} from '@heritage/shared-types';
import { apiFetch } from '@/lib/api-client';

const siteReviewsResponseSchema = paginatedResponseSchema(siteReviewSchema);

// Must live in a server-safe module: the /profile Server Component parses with
// this. Exporting it from a 'use client' file makes the server-side import a
// client-reference stub rather than a real schema.
export const memberReviewsResponseSchema = paginatedResponseSchema(memberReviewSchema);

export async function getSiteReviews(slug: string, page = 1, limit = 20) {
  return apiFetch(
    `/public/sites/${encodeURIComponent(slug)}/reviews?page=${page}&limit=${limit}`,
    siteReviewsResponseSchema,
    { next: { revalidate: 30 } },
  );
}

export type SiteReviewsResponse = PaginatedResponse<SiteReview>;
export type MemberReviewsResponse = PaginatedResponse<MemberReview>;
