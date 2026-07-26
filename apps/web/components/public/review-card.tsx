'use client';

import type { AuthUser, SiteReview } from '@heritage/shared-types';
import { Link } from '@/i18n/navigation';
import { ReviewAvatar } from '@/components/public/review-avatar';
import { ReviewLikeButton } from '@/components/public/review-like-button';

type ReviewCardProps = {
  review: SiteReview;
  slug: string;
  member: AuthUser | null;
  formattedDate: string;
  labels: {
    like: string;
    liked: string;
    likes: string;
    signInToLike: string;
    loginPath: string;
  };
  onReviewChange: (review: SiteReview) => void;
};

export function ReviewCard({
  review,
  slug,
  member,
  formattedDate,
  labels,
  onReviewChange,
}: ReviewCardProps) {
  return (
    <article className="rounded-card border border-brown-800/15 bg-white px-5 py-5 shadow-[0_2px_12px_rgba(42,29,20,0.04)]">
      <div className="flex gap-4">
        <ReviewAvatar name={review.authorName} />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-bold text-brown-950">{review.authorName}</span>
            <time className="text-xs text-brown-600" dateTime={review.updatedAt}>
              {formattedDate}
            </time>
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-brown-800">
            {review.body}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-brown-800/10 pt-4">
            {member ? (
              <ReviewLikeButton
                slug={slug}
                review={review}
                labels={{ like: labels.like, liked: labels.liked, likes: labels.likes }}
                onChange={onReviewChange}
              />
            ) : (
              <Link
                href={labels.loginPath}
                className="inline-flex cursor-pointer items-center gap-2 text-[15px] font-bold text-brown-600 hover:text-teal-700"
              >
                <span aria-hidden className="text-teal-700">+</span>
                {labels.signInToLike}
                {review.likeCount > 0 ? (
                  <span className="font-normal text-brown-600">
                    ({review.likeCount} {labels.likes})
                  </span>
                ) : null}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
