import type { SiteCategory } from '@heritage/shared-types';
import { SITE_CATEGORIES } from '@heritage/shared-types';

/** DOM id for a category section / stack scroll target. */
export function categoryAnchorId(category: SiteCategory): string {
  return `category-${category.toLowerCase()}`;
}

export function groupSitesByCategory<T extends { category: SiteCategory }>(
  sites: T[],
): Record<SiteCategory, T[]> {
  const grouped = Object.fromEntries(SITE_CATEGORIES.map((category) => [category, [] as T[]])) as Record<
    SiteCategory,
    T[]
  >;
  for (const site of sites) {
    grouped[site.category].push(site);
  }
  return grouped;
}
