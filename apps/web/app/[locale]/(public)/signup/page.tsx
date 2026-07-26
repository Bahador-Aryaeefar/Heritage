import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MemberSignupForm } from '@/components/public/member-signup-form';
import { LogoMark } from '@/components/public/logo-mark';
import { Link } from '@/i18n/navigation';

type SignupPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function MemberSignupPage({ params, searchParams }: SignupPageProps) {
  const { locale } = await params;
  const { returnTo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('member.signup');

  return (
    <div className="flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-container border border-brown-800/15 bg-sand-100 p-8 shadow-[0_8px_32px_rgba(42,29,20,0.12)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="rounded-button bg-white p-2 ring-1 ring-brown-800/10">
            <LogoMark className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-brown-950">{t('title')}</h1>
        </div>
        <MemberSignupForm
          redirectTo={returnTo || '/'}
          labels={{
            name: t('name'),
            email: t('email'),
            phone: t('phone'),
            password: t('password'),
            contactHint: t('contactHint'),
            submit: t('submit'),
            error: t('error'),
          }}
        />
        <p className="mt-4 text-center text-[15px] text-brown-800">
          {t('hasAccount')}{' '}
          <Link href="/login" className="font-bold text-teal-700 hover:text-teal-500">
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
