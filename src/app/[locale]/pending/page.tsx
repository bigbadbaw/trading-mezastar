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
      <h1 className="font-display text-2xl font-bold text-vault-text">{t('title')}</h1>
      <p className="text-base text-vault-muted">{t('body')}</p>
      <p className="text-sm text-vault-muted">{t('detail')}</p>
    </main>
  );
}
