'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { useCollection } from '@/components/collection/CollectionProvider';
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
      return 'bg-emerald-100 text-emerald-800';
    case 'most_wanted':
      return 'bg-amber-100 text-amber-800';
    case 'wanted':
      return 'bg-blue-100 text-blue-700';
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
        className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {t('signInToPull')}
      </Link>
    );
  }

  if (!hasAny) {
    return <p className="text-sm text-slate-500">{t('noCollection')}</p>;
  }

  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {GROUP_ORDER.map((key) => {
        const rows = groups[key];
        if (rows.length === 0) return null;
        return (
          <li key={key} className="flex flex-col gap-1.5">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {tColl(STATUS_HEADING_KEY[key])}
            </p>
            <ul className="flex flex-col gap-1.5">
              {rows.map(({ entry, status, quantity }) => {
                const isOwned = status === 'owned';
                return (
                  <li
                    key={entry.tag.tagId}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                  >
                    <span className="text-2xl leading-none" role="img" aria-label={entry.tag.nameEn}>
                      {entry.tag.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{entry.tag.nameEn}</p>
                      <p className="truncate text-xs text-slate-500">{entry.tag.nameZh}</p>
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
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          {t('addToMineShort')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdd('theirs', entry.tag.tagId, quantity)}
                          aria-label={t('addToTheirs')}
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-red-300 bg-red-50 px-2 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          {t('addToTheirsShort')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdd('mine', entry.tag.tagId, quantity)}
                          aria-label={t('addToMine')}
                          className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
