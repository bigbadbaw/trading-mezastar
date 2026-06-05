import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * Waiting room for authenticated-but-unapproved users. The middleware redirects
 * here for any protected route until an admin sets `profiles.approved = true`.
 * Sign-out lives in the layout header (AuthStatus), so this page is just copy.
 */
export default async function PendingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('pending');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <p className="text-base text-slate-600">{t('body')}</p>
      <p className="text-sm text-slate-500">{t('detail')}</p>
    </main>
  );
}
