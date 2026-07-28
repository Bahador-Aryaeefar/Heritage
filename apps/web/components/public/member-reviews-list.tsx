'use client';

import { useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import type { MemberReview, PaginatedResponse } from '@heritage/shared-types';

type MemberReviewsListProps = {
  reviews: PaginatedResponse<MemberReview>;
  locale: string;
  labels: {
    title: string;
    empty: string;
    likes: string;
    viewSite: string;
  };
};

export function MemberReviewsList({ reviews, locale, labels }: MemberReviewsListProps) {
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en', {
        dateStyle: 'medium',
      }),
    [locale],
  );

  return (
    <section className="rounded-card border border-brown-800/15 bg-white px-5 py-6 md:px-6">
      <h2 className="text-[15px] font-bold text-brown-950">{labels.title}</h2>
      {reviews.items.length === 0 ? (
        <p className="mt-4 text-[15px] text-brown-600">{labels.empty}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.items.map((review) => (
            <li
              key={review.id}
              className="rounded-card border border-brown-800/10 bg-sand-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/sites/${review.siteSlug}`}
                  className="text-[15px] font-bold text-teal-700 hover:text-teal-500"
                >
                  {review.siteTitle}
                </Link>
                <time className="text-xs text-brown-600" dateTime={review.updatedAt}>
                  {dateFormatter.format(new Date(review.updatedAt))}
                </time>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed text-brown-800">
                {review.body}
              </p>
              <p className="mt-3 text-xs text-brown-600">
                {review.likeCount} {labels.likes}
              </p>
              <Link
                href={`/sites/${review.siteSlug}`}
                className="mt-2 inline-block text-[15px] font-bold text-brown-800 hover:text-teal-700"
              >
                {labels.viewSite}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
