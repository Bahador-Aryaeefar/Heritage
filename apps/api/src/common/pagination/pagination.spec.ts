import { buildPaginationMeta, normalizePagination } from './pagination';

describe('pagination', () => {
  it('normalizes defaults and caps the limit', () => {
    expect(normalizePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(normalizePagination({ page: 3, limit: 500 })).toEqual({
      page: 3,
      limit: 100,
      skip: 200,
    });
  });

  it('builds reusable pagination metadata', () => {
    expect(buildPaginationMeta(2, 10, 23)).toEqual({
      page: 2,
      limit: 10,
      totalItems: 23,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
