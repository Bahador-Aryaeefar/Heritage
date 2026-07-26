'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import {
  paginatedResponseSchema,
  siteReviewSchema,
  upsertSiteReviewSchema,
  type AuthUser,
  type PaginatedResponse,
  type SiteReview,
} from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { Field, TextArea } from '@/components/ui/text-field';
import { ReviewCard } from '@/components/public/review-card';
import { memberFetch, memberFetchVoid } from '@/lib/member-api';

const reviewsResponseSchema = paginatedResponseSchema(siteReviewSchema);

type SiteReviewsPanelProps = {
  slug: string;
  initialReviews: PaginatedResponse<SiteReview>;
  member: AuthUser | null;
  locale: string;
  labels: {
    title: string;
    composeTitle: string;
    empty: string;
    writePrompt: string;
    loginCta: string;
    signupCta: string;
    body: string;
    submit: string;
    remove: string;
    saved: string;
    error: string;
    like: string;
    liked: string;
    likes: string;
    signInToLike: string;
    loginPath: string;
    signupPath: string;
  };
};

export function SiteReviewsPanel({
  slug,
  initialReviews,
  member,
  locale,
  labels,
}: SiteReviewsPanelProps) {
  const [reviews, setReviews] = useState(initialReviews.items);
  const [body, setBody] = useState('');
  const [hasOwnReview, setHasOwnReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    void (async () => {
      try {
        const own = await memberFetch(
          `/public/sites/${encodeURIComponent(slug)}/reviews/me`,
          siteReviewSchema.nullable(),
        );
        if (own) {
          setBody(own.body);
          setHasOwnReview(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [member, slug]);

  async function reloadReviews() {
    const next = await memberFetch(
      `/public/sites/${encodeURIComponent(slug)}/reviews?page=1&limit=20`,
      reviewsResponseSchema,
    );
    setReviews(next.items);
  }

  function updateReviewInList(next: SiteReview) {
    setReviews((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!member) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const input = upsertSiteReviewSchema.parse({ body });
      const saved = await memberFetch(
        `/public/sites/${encodeURIComponent(slug)}/reviews/me`,
        siteReviewSchema,
        { method: 'PUT', body: JSON.stringify(input) },
      );
      setBody(saved.body);
      setHasOwnReview(true);
      setMessage(labels.saved);
      await reloadReviews();
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!member) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await memberFetchVoid(`/public/sites/${encodeURIComponent(slug)}/reviews/me`, {
        method: 'DELETE',
      });
      setBody('');
      setHasOwnReview(false);
      await reloadReviews();
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  return (
    <section className="mt-12 border-t border-brown-800/10 pt-10">
      <h2 className="text-[clamp(22px,2.5vw,28px)] font-black leading-snug text-brown-950">
        {labels.title}
      </h2>

      {member ? (
        <div className="mt-6 max-w-3xl rounded-card border border-brown-800/15 bg-white px-5 py-5 md:px-6 md:py-6">
          <h3 className="text-[15px] font-bold text-brown-950">{labels.composeTitle}</h3>
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-4">
            <Field label={labels.body}>
              <TextArea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                placeholder={labels.writePrompt}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <ActionButton type="submit" disabled={pending}>
                {labels.submit}
              </ActionButton>
              {hasOwnReview ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void handleRemove()}
                >
                  {labels.remove}
                </ActionButton>
              ) : null}
            </div>
            {message ? <p className="text-[15px] text-teal-700">{message}</p> : null}
            {error ? <p className="text-[15px] text-[#B44B3D]">{error}</p> : null}
          </form>
        </div>
      ) : (
        <div className="mt-6 max-w-3xl rounded-card border border-brown-800/15 bg-white px-5 py-5">
          <p className="text-[15px] text-brown-800">
            {labels.writePrompt}{' '}
            <Link href={labels.loginPath} className="font-bold text-teal-700 hover:text-teal-500">
              {labels.loginCta}
            </Link>{' '}
            /{' '}
            <Link href={labels.signupPath} className="font-bold text-teal-700 hover:text-teal-500">
              {labels.signupCta}
            </Link>
          </p>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-[15px] text-brown-600">{labels.empty}</p>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              slug={slug}
              member={member}
              formattedDate={dateFormatter.format(new Date(review.updatedAt))}
              labels={{
                like: labels.like,
                liked: labels.liked,
                likes: labels.likes,
                signInToLike: labels.signInToLike,
                loginPath: labels.loginPath,
              }}
              onReviewChange={updateReviewInList}
            />
          ))
        )}
      </div>
    </section>
  );
}
