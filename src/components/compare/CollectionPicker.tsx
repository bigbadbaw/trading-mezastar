'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { useCollection } from '@/components/collection/CollectionProvider';
import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import { gradeBadgeClass } from '@/lib/pokemon-types';

import type { SideId } from './BasketPanel';

interface Props {
  byId: ReadonlyMap<string, ScoredTag>;
  onAdd: (side: SideId, tagId: string, quantity: number) => void;
}

/**
 * Collection add-path: quick-add the signed-in user's OWNED tags (the common
 * "my side" case), defaulting the basket quantity to the owned count. Reads the
 * collection only through `CollectionProvider` (RLS-safe; no direct Supabase).
 * Logged out shows a sign-in affordance instead of erroring.
 */
export function CollectionPicker({ byId, onAdd }: Props) {
  const t = useTranslations('compare');
  const { user, authReady, items } = useCollection();

  const owned = useMemo(() => {
    const rows: { entry: ScoredTag; quantity: number }[] = [];
    for (const item of items.values()) {
      if (item.status !== 'owned') continue;
      const entry = byId.get(item.tag_id);
      if (entry) rows.push({ entry, quantity: Math.max(1, item.quantity) });
    }
    return rows.sort((a, b) => a.entry.tag.nameEn.localeCompare(b.entry.tag.nameEn));
  }, [items, byId]);

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

  if (owned.length === 0) {
    return <p className="text-sm text-slate-500">{t('noOwned')}</p>;
  }

  return (
    <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
      {owned.map(({ entry, quantity }) => (
        <li
          key={entry.tag.tagId}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
        >
          <span className="text-2xl leading-none" role="img" aria-label={entry.tag.nameEn}>
            {entry.tag.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{entry.tag.nameEn}</p>
            <p className="truncate text-xs text-slate-500">
              {entry.tag.nameZh} · ×{quantity}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-bold ${gradeBadgeClass(entry.score.grade.grade)}`}
          >
            {entry.score.grade.grade} · {entry.score.total}
          </span>
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
            className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-red-300 bg-red-50 px-2 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t('addToTheirsShort')}
          </button>
        </li>
      ))}
    </ul>
  );
}
