'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { COLLECTION_STATUSES, type CollectionStatus } from '@/data/collection';

import { useCollection } from './CollectionProvider';

const STATUS_LABEL_KEY: Record<CollectionStatus, string> = {
  owned: 'owned',
  wanted: 'wanted',
  most_wanted: 'mostWanted',
};

/**
 * Per-tag collection controls. Renders a status segmented control plus a
 * quantity stepper for owned duplicates. When signed out, shows a sign-in
 * affordance rather than an error. Stops link/card click propagation so it can
 * live next to (or within a card that links to) the detail view.
 */
export function CollectionControls({ tagId }: { tagId: string }) {
  const t = useTranslations('collection');
  const { user, authReady, items, setStatus, setQuantity, remove } =
    useCollection();

  if (!authReady) {
    return <div className="h-11" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center text-sm font-medium text-vault-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      >
        {t('signInToTrack')}
      </Link>
    );
  }

  const current = items.get(tagId);
  const status = current?.status;
  const quantity = current?.quantity ?? 1;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label={t('statusLabel')}
        className="flex flex-wrap gap-1.5"
      >
        {COLLECTION_STATUSES.map((option) => {
          const active = status === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (active) void remove(tagId);
                else void setStatus(tagId, option);
              }}
              className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold ${
                active
                  ? 'border-vault-gold bg-vault-gold text-vault-bg'
                  : 'border-vault-hairline bg-vault-bg text-vault-text hover:border-vault-gold'
              }`}
            >
              {t(STATUS_LABEL_KEY[option])}
            </button>
          );
        })}
      </div>

      {status === 'owned' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-vault-muted">{t('quantity')}</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-label={t('decrement')}
              onClick={() => void setQuantity(tagId, Math.max(0, quantity - 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-vault-hairline text-lg font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
            >
              −
            </button>
            <span
              className="min-w-9 text-center font-mono text-base font-medium tabular-nums text-vault-text"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label={t('increment')}
              onClick={() => void setQuantity(tagId, quantity + 1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-vault-hairline text-lg font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
