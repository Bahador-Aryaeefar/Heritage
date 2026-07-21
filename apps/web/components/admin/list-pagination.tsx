'use client';

import type { ReactNode } from 'react';
import type { PaginationMeta } from '@heritage/shared-types';

type ListPaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  labels: {
    first: string;
    previous: string;
    next: string;
    last: string;
  };
};

/** Up to three consecutive page numbers centered on the current page. */
function visiblePages(current: number, total: number): number[] {
  if (total <= 3) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  if (current <= 2) return [1, 2, 3];
  if (current >= total - 1) return [total - 2, total - 1, total];
  return [current - 1, current, current + 1];
}

export function ListPagination({ meta, onPageChange, labels }: ListPaginationProps) {
  const totalPages = Math.max(1, meta.totalPages);
  const page = Math.min(Math.max(1, meta.page || 1), totalPages);
  const pages = visiblePages(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-card border border-brown-800/15 bg-white px-4 py-3">
      <IconButton
        label={labels.first}
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
      >
        <PaginationIcon kind="first" />
      </IconButton>
      <IconButton
        label={labels.previous}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <PaginationIcon kind="prev" />
      </IconButton>

      {pages.map((n) => {
        const selected = n === page;
        return (
          <button
            key={n}
            type="button"
            aria-label={String(n)}
            aria-current={selected ? 'page' : undefined}
            onClick={() => onPageChange(n)}
            className={`inline-flex h-11 min-w-11 items-center justify-center rounded-button px-3 text-[15px] font-bold transition-colors ${
              selected
                ? 'bg-teal-700 text-sand-50'
                : 'border border-brown-800/15 bg-white text-brown-800 hover:bg-sand-50'
            }`}
          >
            {n}
          </button>
        );
      })}

      <IconButton
        label={labels.next}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <PaginationIcon kind="next" />
      </IconButton>
      <IconButton
        label={labels.last}
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        <PaginationIcon kind="last" />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button border border-brown-800/15 bg-white text-brown-800 transition-colors hover:bg-sand-50 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function PaginationIcon({ kind }: { kind: 'first' | 'prev' | 'next' | 'last' }) {
  // Paths drawn for LTR; flip for RTL so "start/end" stay correct.
  const flip =
    kind === 'prev' || kind === 'first'
      ? 'rtl:rotate-180'
      : 'rotate-180 rtl:rotate-0';

  if (kind === 'first' || kind === 'last') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-5 w-5 text-teal-700 ${flip}`}>
        <path
          d="M4.5 5.25v9.5M14.25 5.25 9.5 10l4.75 4.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-5 w-5 text-teal-700 ${flip}`}>
      <path
        d="M12.5 5.25 7.75 10l4.75 4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
