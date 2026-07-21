'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { SITE_CATEGORIES, type SiteCategory } from '@heritage/shared-types';
import { CategoryCover } from '@/components/ui/category-cover';
import { resolveCoverUrl } from '@/lib/media-url';

export type CategoryStackCard = {
  category: SiteCategory;
  title: string;
  blurb: string;
  coverUrl: string | null;
  coverSlug: string;
  /** Already localized, e.g. "5 places". */
  countLabel: string;
};

type CategoryStackProps = {
  cards: CategoryStackCard[];
  eyebrow: string;
  title: string;
  hint: string;
};

/** Pause between card switches (transition duration stays at SLIDE_MS). */
const AUTO_ADVANCE_MS = 5500;
/** Card fan / crossfade transition. */
const SLIDE_MS = 500;

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * 3D fanned category cards under the landing hero. Auto-advances through
 * categories. Click/tab selects a card only (no page scroll). Reduced motion
 * uses a flat crossfade.
 */
export function CategoryStack({ cards, eyebrow, title, hint }: CategoryStackProps) {
  const ordered = SITE_CATEGORIES.map(
    (category) => cards.find((card) => card.category === category) ?? null,
  ).filter((card): card is CategoryStackCard => Boolean(card));

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    if (ordered.length < 2 || reducedMotion || paused) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % ordered.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [ordered.length, reducedMotion, paused]);

  if (ordered.length === 0) return null;

  return (
    <section
      id="categories"
      className="w-full bg-sand-100/90 py-[70px] max-md:py-10"
      aria-roledescription="carousel"
      aria-label={title}
    >
      <div className="mx-auto w-full max-w-[1400px] px-[6vw]">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold tracking-wide text-teal-700">{eyebrow}</p>
          <h2 className="mt-2 text-[clamp(22px,2.5vw,28px)] font-black text-brown-950">{title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-brown-600">{hint}</p>
        </div>

        <div
          className="relative mx-auto h-[340px] max-w-3xl max-md:h-[300px]"
          style={{ perspective: reducedMotion ? undefined : '1200px' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setPaused(false);
            }
          }}
        >
          <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
            {ordered.map((card, index) => {
              const offset = index - active;
              const wrapped =
                ((offset + ordered.length + Math.floor(ordered.length / 2)) % ordered.length) -
                Math.floor(ordered.length / 2);
              const isActive = index === active;
              const coverSrc = resolveCoverUrl(card.coverUrl, card.coverSlug);
              const transform = reducedMotion
                ? undefined
                : `translateX(${wrapped * 18}%) translateZ(${isActive ? 40 : -Math.abs(wrapped) * 60}px) rotateY(${wrapped * -14}deg) scale(${isActive ? 1 : 0.88})`;

              return (
                <button
                  key={card.category}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={card.title}
                  aria-current={isActive ? 'true' : undefined}
                  className={`absolute inset-[8%] overflow-hidden rounded-container border border-brown-800/20 bg-white text-start shadow-[0_16px_44px_rgba(42,29,20,0.22)] transition-[transform,opacity] ease-out ${
                    reducedMotion
                      ? isActive
                        ? 'z-10 opacity-100'
                        : 'pointer-events-none z-0 opacity-0'
                      : isActive
                        ? 'z-10'
                        : 'z-0'
                  }`}
                  style={
                    reducedMotion
                      ? { transitionDuration: `${SLIDE_MS}ms` }
                      : {
                          transform,
                          opacity: Math.abs(wrapped) > 2 ? 0 : 1,
                          transitionDuration: `${SLIDE_MS}ms`,
                        }
                  }
                >
                  <div className="relative h-[58%] w-full overflow-hidden">
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 900px) 90vw, 640px"
                        unoptimized={coverSrc.endsWith('.webp')}
                      />
                    ) : (
                      <CategoryCover category={card.category} />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-brown-950/55 to-transparent" />
                  </div>
                  <div className="space-y-1.5 border-t-4 border-teal-700 p-5">
                    <p className="text-xs font-bold tracking-wide text-teal-700">{card.countLabel}</p>
                    <h3 className="text-[17px] font-bold text-brown-950">{card.title}</h3>
                    <p className="line-clamp-2 text-[15px] leading-relaxed text-brown-800">
                      {card.blurb}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2" role="tablist">
          {ordered.map((card, index) => {
            const selected = index === active;
            return (
              <button
                key={card.category}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(index)}
                className={`rounded-button px-3 py-1.5 text-xs font-bold transition-colors ${
                  selected
                    ? 'bg-teal-700 text-sand-50'
                    : 'border border-brown-800/15 bg-white text-brown-800 hover:bg-sand-50'
                }`}
              >
                {card.title}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
