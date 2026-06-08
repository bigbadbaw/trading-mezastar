'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { CollectionStatus } from '@/data/collection';

import { useCollection } from './CollectionProvider';

const STATUS_LABEL_KEY: Record<CollectionStatus, string> = {
  owned: 'owned',
  wanted: 'wanted',
  most_wanted: 'mostWanted',
};

/** Compact glyphs for the icon toggles (kid-friendly, paired with aria-labels). */
const STATUS_ICON: Record<CollectionStatus, string> = {
  wanted: '♡',
  most_wanted: '♥',
  owned: '✓',
};

/** Toggle order shown to the user: unowned first, then the three tracked states. */
const STATUS_ORDER: readonly CollectionStatus[] = ['wanted', 'most_wanted', 'owned'];

function toggleClass(active: boolean): string {
  return `inline-flex h-11 w-11 items-center justify-center rounded-lg border text-lg leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold ${
    active
      ? 'border-vault-gold bg-vault-gold text-vault-bg'
      : 'border-vault-hairline bg-vault-bg text-vault-text hover:border-vault-gold'
  }`;
}

/**
 * Per-tag collection controls: a 4-state ownership row (unowned / want /
 * most-want / owned) as compact icon toggles — one tap to set — plus a quantity
 * stepper that appears in place only when the tag is owned. When signed out, the
 * whole zone collapses to a single "sign in to track" line. Persistence is
 * unchanged (Supabase collection_items via CollectionProvider).
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
        {/* Unowned: active when no row exists; one tap clears the tag. */}
        <button
          type="button"
          aria-label={t('notOwned')}
          title={t('notOwned')}
          aria-pressed={status === undefined}
          onClick={() => {
            if (status !== undefined) void remove(tagId);
          }}
          className={toggleClass(status === undefined)}
        >
          ✕
        </button>
        {STATUS_ORDER.map((option) => {
          const active = status === option;
          const label = t(STATUS_LABEL_KEY[option]);
          return (
            <button
              key={option}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={active}
              onClick={() => {
                if (active) void remove(tagId);
                else void setStatus(tagId, option);
              }}
              className={toggleClass(active)}
            >
              {STATUS_ICON[option]}
            </button>
          );
        })}

        {/* Quantity stepper appears in place, only for owned duplicates. */}
        {status === 'owned' && (
          <div className="ml-1 inline-flex items-center gap-1">
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
              aria-label={t('quantity')}
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
        )}
      </div>
    </div>
  );
}
