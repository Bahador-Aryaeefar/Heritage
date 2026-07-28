import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MemberProfileForm } from '@/components/public/member-profile-form';
import { MemberReviewsList } from '@/components/public/member-reviews-list';
import { ReviewAvatar } from '@/components/public/review-avatar';
import { getMemberSessionUser } from '@/lib/member-session';
import { memberReviewsResponseSchema } from '@/lib/reviews';
import { memberFetchServer } from '@/lib/member-server-api';
import { localizedPath } from '@/i18n/locales';

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MemberProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const member = await getMemberSessionUser();
  if (!member) {
    redirect(localizedPath(locale, '/login?returnTo=/profile'));
  }

  const t = await getTranslations('member.profile');
  let reviews = memberReviewsResponseSchema.parse({
    items: [],
    meta: {
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });

  try {
    reviews = await memberFetchServer(
      `/auth/me/reviews?locale=${encodeURIComponent(locale)}&page=1&limit=20`,
      memberReviewsResponseSchema,
    );
  } catch {
    /* empty list fallback */
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-[5vw] py-12 md:py-16">
      <div className="mb-8 flex items-center gap-4">
        <ReviewAvatar name={member.displayName ?? 'Member'} className="h-14 w-14 text-lg" />
        <div>
          <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">{t('title')}</h1>
          <p className="mt-1 text-[15px] text-brown-600">{t('subtitle')}</p>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-[15px] font-bold text-brown-950">{t('accountTitle')}</h2>
          <MemberProfileForm
            user={member}
            labels={{
              name: t('name'),
              email: t('email'),
              phone: t('phone'),
              password: t('password'),
              passwordHint: t('passwordHint'),
              contactHint: t('contactHint'),
              submit: t('submit'),
              saved: t('saved'),
              error: t('error'),
              logout: t('logout'),
            }}
          />
        </section>

        <MemberReviewsList
          reviews={reviews}
          locale={locale}
          labels={{
            title: t('reviewsTitle'),
            empty: t('reviewsEmpty'),
            likes: t('likes'),
            viewSite: t('viewSite'),
          }}
        />
      </div>
    </div>
  );
}
