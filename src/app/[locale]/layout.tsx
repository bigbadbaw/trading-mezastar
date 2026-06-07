import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { CollectionProvider } from '@/components/collection/CollectionProvider';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Mezastar Trade-Fairness Tool',
  description: 'Check whether a proposed Pokémon Mezastar tag trade is fair.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const messages = await getMessages();
  const tCommon = await getTranslations('common');

  return (
    <html lang={locale}>
      <body className={fontVariables}>
        <NextIntlClientProvider messages={messages}>
          <CollectionProvider>
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2 sm:px-6">
              <nav className="flex items-center gap-3">
                <Link
                  href="/catalog"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-900 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {tCommon('appName')}
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {tCommon('navCompare')}
                </Link>
              </nav>
              <AuthStatus />
            </header>
            {children}
          </CollectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
