'use client';

import { useTranslations } from 'next-intl';

import { useCollection } from '@/components/collection/CollectionProvider';
import { Link } from '@/i18n/navigation';

/**
 * Auth indicator for the global header. A client island so the catalog pages
 * stay static — it reads the session from the browser client via context, not
 * from server cookies.
 */
export function AuthStatus() {
  const t = useTranslations('auth');
  const { user, authReady, signOut } = useCollection();

  if (!authReady) {
    return <span className="text-sm text-slate-400">{t('loading')}</span>;
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {t('signIn')}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 sm:inline">
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {t('signOut')}
      </button>
    </div>
  );
}
