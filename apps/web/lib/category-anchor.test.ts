import { describe, expect, it } from 'vitest';
import { categoryAnchorId, groupSitesByCategory } from './category-anchor';

describe('categoryAnchorId', () => {
  it('lowercases the category enum', () => {
    expect(categoryAnchorId('HISTORICAL')).toBe('category-historical');
    expect(categoryAnchorId('FOOD')).toBe('category-food');
  });
});

describe('groupSitesByCategory', () => {
  it('buckets sites and keeps empty categories', () => {
    const grouped = groupSitesByCategory([
      { category: 'FOOD' as const, slug: 'a' },
      { category: 'FOOD' as const, slug: 'b' },
      { category: 'STREET' as const, slug: 'c' },
    ]);
    expect(grouped.FOOD).toHaveLength(2);
    expect(grouped.STREET).toHaveLength(1);
    expect(grouped.HISTORICAL).toHaveLength(0);
  });
});
