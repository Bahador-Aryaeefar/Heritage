import type { SiteCategory } from '@heritage/shared-types';

type CategoryCoverProps = {
  category: SiteCategory;
  /** Accessible name when used as a standalone image substitute. */
  label?: string;
  className?: string;
};

function CategoryIcon({ category }: { category: SiteCategory }) {
  const common = {
    viewBox: '0 0 48 48',
    className: 'h-10 w-10 text-brown-800/70',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (category) {
    case 'HISTORICAL':
      return (
        <svg {...common}>
          <path d="M8 38V18l16-10 16 10v20" />
          <path d="M18 38V26h12v12" />
          <path d="M8 38h32" />
        </svg>
      );
    case 'HANDICRAFT':
      return (
        <svg {...common}>
          <path d="M14 34c4-10 8-16 10-20 2 4 6 10 10 20" />
          <path d="M18 28h12" />
          <circle cx="24" cy="14" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'STREET':
      return (
        <svg {...common}>
          <path d="M10 38V16l8-6h12l8 6v22" />
          <path d="M20 38V26h8v12" />
          <path d="M6 38h36" />
          <path d="M24 10v6" />
        </svg>
      );
    case 'LANDMARK':
      return (
        <svg {...common}>
          <path d="M24 40s-12-10-12-18a12 12 0 0 1 24 0c0 8-12 18-12 18z" />
          <circle cx="24" cy="22" r="4" />
        </svg>
      );
    case 'FOOD':
      return (
        <svg {...common}>
          <path d="M12 20c0 8 5 14 12 14s12-6 12-14" />
          <path d="M10 20h28" />
          <path d="M24 34v6" />
          <path d="M16 14v4M24 12v6M32 14v4" />
        </svg>
      );
  }
}

/**
 * Default cover when a site has no photo: brown→teal gradient + category line icon.
 * Use inside a sized container (`relative` + fixed height) or pass `className` for the fill.
 */
export function CategoryCover({ category, label, className = '' }: CategoryCoverProps) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`flex h-full w-full items-center justify-center bg-linear-to-br from-brown-800/25 to-teal-700/30 ${className}`}
    >
      <CategoryIcon category={category} />
    </div>
  );
}
