'use client';

import { useTranslations } from 'next-intl';

import type { SideScore } from '@/lib/compare/basket';

import { BasketLineRow } from './BasketLineRow';

export type SideId = 'mine' | 'theirs';

interface Props {
  side: SideId;
  score: SideScore;
  locale: string;
  onSetQuantity: (tagId: string, quantity: number) => void;
  onRemove: (tagId: string) => void;
  onClear: () => void;
}

const SIDE_META: Record<SideId, { emoji: string; titleKey: 'mySide' | 'theirSide'; ring: string }> = {
  mine: { emoji: '🟢', titleKey: 'mySide', ring: 'border-emerald-300' },
  theirs: { emoji: '🔴', titleKey: 'theirSide', ring: 'border-red-300' },
};

/** One side of the trade: header with running score, the lines, and a clear. */
export function BasketPanel({ side, score, locale, onSetQuantity, onRemove, onClear }: Props) {
  const t = useTranslations('compare');
  const meta = SIDE_META[side];
  const { basket, lines } = score;

  return (
    <section
      aria-label={t(meta.titleKey)}
      className={`flex flex-col rounded-xl border-2 bg-slate-50 p-4 ${meta.ring}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span aria-hidden>{meta.emoji}</span>
          {t(meta.titleKey)}
        </h2>
        <div className="text-right">
          <p className="text-sm text-slate-500">{t('sideScore')}</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {basket.total}{' '}
            <span className="text-base font-medium text-slate-500">{t('sideScoreUnit')}</span>
          </p>
        </div>
      </div>

      <p className="mb-3 text-sm tabular-nums text-slate-500">
        {t('sideMarket')}: NT${Math.round(basket.medianPriceSum)}
      </p>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t('emptySide')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <BasketLineRow
              key={line.entry.tag.tagId}
              line={line}
              locale={locale}
              onSetQuantity={(q) => onSetQuantity(line.entry.tag.tagId, q)}
              onRemove={() => onRemove(line.entry.tag.tagId)}
            />
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 inline-flex min-h-11 w-fit items-center self-end rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {t('clearSide')}
        </button>
      )}
    </section>
  );
}
