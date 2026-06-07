'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ScoredTag } from '@/data/catalog';
import { TagImage } from '@/components/catalog/TagImage';
import { gradeBadgeClass } from '@/lib/pokemon-types';

import type { SideId } from './BasketPanel';

/** Mirror of the M3 catalog search: dependency-free substring over names + num. */
function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim();
}

const MAX_RESULTS = 40;

interface Props {
  entries: ScoredTag[];
  locale: string;
  onAdd: (side: SideId, tagId: string) => void;
}

/** Catalog add-path: search any tag (owned or not) and add it to either side. */
export function TagPicker({ entries, onAdd }: Props) {
  const t = useTranslations('compare');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [] as ScoredTag[];
    const matches: ScoredTag[] = [];
    for (const entry of entries) {
      const { tag } = entry;
      const hay = `${normalize(tag.nameEn)} ${normalize(tag.nameZh)} ${normalize(tag.num)}`;
      if (hay.includes(q)) {
        matches.push(entry);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  }, [entries, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="min-h-11 w-full rounded-lg border border-vault-hairline bg-vault-bg px-3 text-base text-vault-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      />

      {query.trim() !== '' && (
        <>
          <p className="mt-2 text-sm text-vault-muted" aria-live="polite">
            {t('searchResults', { count: results.length })}
          </p>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-vault-muted">{t('noResults')}</p>
          ) : (
            <ul className="mt-2 flex max-h-[30rem] flex-col gap-1.5 overflow-y-auto">
              {results.map((entry) => (
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
                    <p className="truncate font-display text-sm font-semibold text-vault-text">
                      {entry.tag.nameEn}
                    </p>
                    <p className="truncate text-xs text-vault-muted">{entry.tag.nameZh}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${gradeBadgeClass(entry.score.grade.grade)}`}
                  >
                    {entry.score.grade.grade} · {entry.score.total}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdd('mine', entry.tag.tagId)}
                    aria-label={t('addToMine')}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-status-mine/50 bg-status-mine/15 px-2 text-sm font-medium text-status-mine hover:bg-status-mine/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
                  >
                    {t('addToMineShort')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdd('theirs', entry.tag.tagId)}
                    aria-label={t('addToTheirs')}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-status-theirs/50 bg-status-theirs/15 px-2 text-sm font-medium text-status-theirs hover:bg-status-theirs/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
                  >
                    {t('addToTheirsShort')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
