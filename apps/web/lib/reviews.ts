import {
  paginatedResponseSchema,
  siteReviewSchema,
  type PaginatedResponse,
  type SiteReview,
} from '@heritage/shared-types';
import { apiFetch } from '@/lib/api-client';

const siteReviewsResponseSchema = paginatedResponseSchema(siteReviewSchema);

export async function getSiteReviews(slug: string, page = 1, limit = 20) {
  return apiFetch(
    `/public/sites/${encodeURIComponent(slug)}/reviews?page=${page}&limit=${limit}`,
    siteReviewsResponseSchema,
    { next: { revalidate: 30 } },
  );
}

export type SiteReviewsResponse = PaginatedResponse<SiteReview>;
