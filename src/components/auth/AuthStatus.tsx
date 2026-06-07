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
    return <span className="text-sm text-vault-muted">{t('loading')}</span>;
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-vault-gold hover:bg-vault-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      >
        {t('signIn')}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[12rem] truncate text-sm text-vault-muted sm:inline">
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex min-h-11 items-center rounded-lg border border-vault-hairline px-3 text-sm font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      >
        {t('signOut')}
      </button>
    </div>
  );
}
