import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Vazirmatn } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDir } from '@/i18n/direction';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Design system §2: Vazirmatn alone across weights builds the hierarchy.
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
});

export const metadata: Metadata = {
  title: 'میراث کرمانشاه | Kermanshah Heritage',
  description: 'میراث فرهنگی کرمانشاه، یک اسکن تا تاریخ',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={getDir(locale)} className={vazirmatn.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
