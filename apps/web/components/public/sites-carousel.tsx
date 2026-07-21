'use client';

import {
  Children,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const GAP_PX = 20;
/** Prefer carousel whenever the list is longer than this. */
const FORCE_CAROUSEL_AFTER = 4;
const CARD_MIN_WIDTH: Record<'default' | 'compact' | 'rail' | 'featured', number> = {
  featured: 300,
  default: 250,
  compact: 190,
  rail: 230,
};

type SitesCarouselProps = {
  itemCount: number;
  /** Visual density hint for how wide each slide should be. */
  density?: keyof typeof CARD_MIN_WIDTH;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
};

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function getResizeSnapshot() {
  return window.innerWidth;
}

function getResizeServerSnapshot() {
  return 1200;
}

/**
 * Shows a window of site cards with side prev/next controls when there are more
 * than 4 items, or when the viewport cannot fit the full list. Advances **one
 * card at a time**. Otherwise renders a static wrapping grid (no scrollbar).
 */
export function SitesCarousel({
  itemCount,
  density = 'default',
  prevLabel,
  nextLabel,
  children,
}: SitesCarouselProps) {
  const items = Children.toArray(children);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const windowWidth = useSyncExternalStore(
    subscribeResize,
    getResizeSnapshot,
    getResizeServerSnapshot,
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const measure = () => setViewportWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [windowWidth, itemCount]);

  const minCard = CARD_MIN_WIDTH[density];
  const visibleCount = Math.max(
    1,
    viewportWidth > 0 ? Math.floor((viewportWidth + GAP_PX) / (minCard + GAP_PX)) : 3,
  );
  const fitsAll = itemCount <= visibleCount;
  const useCarousel = itemCount > FORCE_CAROUSEL_AFTER || !fitsAll;
  const maxOffset = Math.max(0, itemCount - visibleCount);
  const safeOffset = Math.min(offset, maxOffset);

  if (itemCount === 0) return null;

  if (!useCarousel) {
    return (
      <div
        ref={viewportRef}
        className={`grid gap-5 ${
          density === 'compact'
            ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {children}
      </div>
    );
  }

  const visible = items.slice(safeOffset, safeOffset + visibleCount);
  const columns = Math.min(visibleCount, visible.length);

  return (
    <div className="relative flex items-center gap-3 max-md:gap-2">
      <CarouselButton
        label={prevLabel}
        disabled={safeOffset <= 0}
        onClick={() => {
          setDirection('prev');
          setOffset((current) => Math.max(0, current - 1));
        }}
      >
        <SideChevron direction="prev" />
      </CarouselButton>

      <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
        <div
          key={`${safeOffset}-${columns}`}
          className={`grid gap-5 ${
            direction === 'next' ? 'animate-sites-slide-next' : 'animate-sites-slide-prev'
          }`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {visible}
        </div>
      </div>

      <CarouselButton
        label={nextLabel}
        disabled={safeOffset >= maxOffset}
        onClick={() => {
          setDirection('next');
          setOffset((current) => Math.min(maxOffset, current + 1));
        }}
      >
        <SideChevron direction="next" />
      </CarouselButton>
    </div>
  );
}

function CarouselButton({
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button border border-brown-800/15 bg-white text-brown-800 shadow-[0_8px_20px_rgba(42,29,20,0.12)] transition-colors hover:bg-sand-50 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function SideChevron({ direction }: { direction: 'prev' | 'next' }) {
  // Path points toward the start (◀ in LTR). Flip so prev/next match button sides.
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-5 w-5 text-teal-700 ${
        direction === 'prev' ? 'rtl:rotate-180' : 'rotate-180 rtl:rotate-0'
      }`}
    >
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
