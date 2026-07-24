import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MemberLoginForm } from '@/components/public/member-login-form';
import { HeritagePageBackground } from '@/components/public/heritage-page-background';
import { LanguageSwitcher } from '@/components/public/language-switcher';
import { LogoMark } from '@/components/public/logo-mark';
import { SiteFooter } from '@/components/public/site-footer';
import { Link } from '@/i18n/navigation';

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function MemberLoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { returnTo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('member.login');
  const tFooter = await getTranslations('footer');

  return (
    <div className="relative flex min-h-screen flex-col">
      <HeritagePageBackground />
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="absolute end-6 top-6 z-30">
          <LanguageSwitcher />
        </div>
        <div className="relative w-full max-w-md rounded-container border border-brown-800/15 bg-sand-100 p-8 shadow-[0_8px_32px_rgba(42,29,20,0.12)]">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="rounded-button bg-white p-2 ring-1 ring-brown-800/10">
              <LogoMark className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-brown-950">{t('title')}</h1>
          </div>
          <MemberLoginForm
            redirectTo={returnTo || '/'}
            labels={{
              identifier: t('identifier'),
              password: t('password'),
              submit: t('submit'),
              error: t('error'),
            }}
          />
          <p className="mt-4 text-center text-[15px] text-brown-800">
            {t('noAccount')}{' '}
            <Link href="/signup" className="font-bold text-teal-700 hover:text-teal-500">
              {t('signupLink')}
            </Link>
          </p>
        </div>
      </div>
      <SiteFooter tagline={tFooter('tagline')} />
    </div>
  );
}
