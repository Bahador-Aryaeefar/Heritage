'use client';

import { useState } from 'react';
import type { SiteReview } from '@heritage/shared-types';
import { siteReviewSchema } from '@heritage/shared-types';
import { memberFetch } from '@/lib/member-api';

type ReviewLikeButtonProps = {
  slug: string;
  review: SiteReview;
  labels: {
    like: string;
    liked: string;
    likes: string;
  };
  onChange: (review: SiteReview) => void;
};

export function ReviewLikeButton({ slug, review, labels, onChange }: ReviewLikeButtonProps) {
  const [pending, setPending] = useState(false);
  const liked = review.likedByMe ?? false;

  async function toggleLike() {
    if (pending) return;
    setPending(true);
    try {
      const path = `/public/sites/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(review.id)}/like`;
      const next = await memberFetch(path, siteReviewSchema, {
        method: liked ? 'DELETE' : 'POST',
      });
      onChange(next);
    } catch {
      /* ignore */
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void toggleLike()}
      aria-pressed={liked}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-button border px-3 py-1.5 text-[15px] font-bold transition-colors disabled:opacity-60 ${
        liked
          ? 'border-teal-700 bg-teal-700 text-sand-50'
          : 'border-brown-800/20 bg-sand-50 text-brown-800 hover:border-teal-700 hover:text-teal-700'
      }`}
    >
      <span aria-hidden>{liked ? '*' : '+'}</span>
      {liked ? labels.liked : labels.like}
      <span className="font-normal opacity-90">
        {review.likeCount} {labels.likes}
      </span>
    </button>
  );
}
