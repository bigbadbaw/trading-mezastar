'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { useCollection } from '@/components/collection/CollectionProvider';
import { TagImage } from '@/components/catalog/TagImage';
import type { CollectionStatus } from '@/data/collection';
import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import { gradeBadgeClass } from '@/lib/pokemon-types';

import type { SideId } from './BasketPanel';

interface Props {
  byId: ReadonlyMap<string, ScoredTag>;
  onAdd: (side: SideId, tagId: string, quantity: number) => void;
}

interface PickerRow {
  entry: ScoredTag;
  status: CollectionStatus;
  quantity: number;
}

/** Render order for status groups: owned first, then most-wanted, then wanted. */
const GROUP_ORDER = ['owned', 'most_wanted', 'wanted'] as const satisfies ReadonlyArray<CollectionStatus>;

/** Maps a group key to the corresponding `collection` namespace label key. */
const STATUS_HEADING_KEY: Record<CollectionStatus, string> = {
  owned: 'owned',
  most_wanted: 'mostWanted',
  wanted: 'wanted',
};

function statusPillClass(status: CollectionStatus): string {
  switch (status) {
    case 'owned':
      return 'bg-status-owned/20 text-status-owned';
    case 'most_wanted':
      return 'bg-status-most-wanted/20 text-status-most-wanted';
    case 'wanted':
      return 'bg-status-wanted/20 text-status-wanted';
  }
}

type Groups = {
  owned: PickerRow[];
  most_wanted: PickerRow[];
  wanted: PickerRow[];
};

/**
 * Collection add-path: quick-add the signed-in user's owned, wanted, and
 * most-wanted tags. Groups by status (owned → most-wanted → wanted), sorts
 * each group alphabetically. The primary add-button defaults to "mine" for
 * owned tags and "theirs" for wanted/most-wanted. Reads the collection only
 * through `CollectionProvider` (RLS-safe; no direct Supabase).
 * Logged out shows a sign-in affordance instead of erroring.
 */
export function CollectionPicker({ byId, onAdd }: Props) {
  const t = useTranslations('compare');
  const tColl = useTranslations('collection');
  const { user, authReady, items } = useCollection();

  const groups = useMemo<Groups>(() => {
    const g: Groups = { owned: [], most_wanted: [], wanted: [] };
    for (const item of items.values()) {
      const entry = byId.get(item.tag_id);
      if (!entry) continue;
      const quantity = item.status === 'owned' ? Math.max(1, item.quantity) : 1;
      g[item.status].push({ entry, status: item.status, quantity });
    }
    for (const rows of Object.values(g)) {
      rows.sort((a, b) => a.entry.tag.nameEn.localeCompare(b.entry.tag.nameEn));
    }
    return g;
  }, [items, byId]);

  const hasAny = GROUP_ORDER.some((key) => groups[key].length > 0);

  if (!authReady) {
    return <div className="h-11" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center text-sm font-medium text-vault-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      >
        {t('signInToPull')}
      </Link>
    );
  }

  if (!hasAny) {
    return <p className="text-sm text-vault-muted">{t('noCollection')}</p>;
  }

  return (
    <ul className="flex max-h-[30rem] flex-col gap-2 overflow-y-auto">
      {GROUP_ORDER.map((key) => {
        const rows = groups[key];
        if (rows.length === 0) return null;
        return (
          <li key={key} className="flex flex-col gap-1.5">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-vault-muted">
              {tColl(STATUS_HEADING_KEY[key])}
            </p>
            <ul className="flex flex-col gap-1.5">
              {rows.map(({ entry, status, quantity }) => {
                const isOwned = status === 'owned';
                return (
                  <li
                    key={entry.tag.tagId}
                    className="flex items-center gap-3 rounded-lg border border-vault-hairline p-3"
                    style={{ backgroundColor: 'var(--panel-fill)' }}
                  >
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: 'var(--vault-bg)' }}
                    >
                      <TagImage
                        tagId={entry.tag.tagId}
                        emoji={entry.tag.emoji}
                        nameEn={entry.tag.nameEn}
                        imgClassName="h-16 w-auto object-contain"
                        emojiClassName="text-5xl leading-none"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold text-vault-text">{entry.tag.nameEn}</p>
                      <p className="truncate text-xs text-vault-muted">{entry.tag.nameZh}</p>
                    </div>
                    {/* Status pill */}
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-bold ${statusPillClass(status)}`}
                    >
                      {status === 'owned'
                        ? t('pillOwned', { quantity })
                        : status === 'most_wanted'
                          ? t('pillMostWanted')
                          : t('pillWanted')}
                    </span>
                    {/* Grade badge */}
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-bold ${gradeBadgeClass(entry.score.grade.grade)}`}
                    >
                      {entry.score.grade.grade} · {entry.score.total}
                    </span>
                    {/* Primary button first; secondary is de-emphasised slate outline */}
                    {isOwned ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onAdd('mine', entry.tag.tagId, quantity)}
                          aria-label={t('addToMine')}
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-status-mine/50 bg-status-mine/15 px-2 text-sm font-medium text-status-mine hover:bg-status-mine/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
                        >
                          {t('addToMineShort')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdd('theirs', entry.tag.tagId, quantity)}
                          aria-label={t('addToTheirs')}
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-vault-hairline bg-vault-bg px-2 text-sm font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
                        >
                          {t('addToTheirsShort')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onAdd('theirs', entry.tag.tagId, quantity)}
                          aria-label={t('addToTheirs')}
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-status-theirs/50 bg-status-theirs/15 px-2 text-sm font-medium text-status-theirs hover:bg-status-theirs/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
                        >
                          {t('addToTheirsShort')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdd('mine', entry.tag.tagId, quantity)}
                          aria-label={t('addToMine')}
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-vault-hairline bg-vault-bg px-2 text-sm font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
                        >
                          {t('addToMineShort')}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
