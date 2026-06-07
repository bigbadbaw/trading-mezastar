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

const SIDE_META: Record<
  SideId,
  { emoji: string; titleKey: 'mySide' | 'theirSide'; ringPopulated: string; ringEmpty: string }
> = {
  mine: {
    emoji: '🟢',
    titleKey: 'mySide',
    ringPopulated: 'border-vault-gold',
    ringEmpty: 'border-dashed border-vault-hairline',
  },
  theirs: {
    emoji: '🔴',
    titleKey: 'theirSide',
    ringPopulated: 'border-vault-gold',
    ringEmpty: 'border-dashed border-vault-hairline',
  },
};

/** One side of the trade: header with running score, the lines, and a clear. */
export function BasketPanel({ side, score, locale, onSetQuantity, onRemove, onClear }: Props) {
  const t = useTranslations('compare');
  const meta = SIDE_META[side];
  const { basket, lines } = score;
  const populated = lines.length > 0;

  return (
    <section
      aria-label={t(meta.titleKey)}
      className={`flex flex-col rounded-xl border-2 p-4 ${populated ? meta.ringPopulated : meta.ringEmpty}`}
      style={{ backgroundColor: 'var(--panel-fill)' }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-vault-text">
          <span aria-hidden>{meta.emoji}</span>
          {t(meta.titleKey)}
        </h2>
        <div className="text-right">
          <p className="text-sm text-vault-muted">{t('sideScore')}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-vault-text">
            {basket.total}{' '}
            <span className="text-base font-medium text-vault-muted">{t('sideScoreUnit')}</span>
          </p>
        </div>
      </div>

      <p className="mb-3 font-mono text-sm tabular-nums text-vault-muted">
        {t('sideMarket')}: NT${Math.round(basket.medianPriceSum)}
      </p>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-vault-hairline p-6 text-center text-sm text-vault-muted">
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
          className="mt-3 inline-flex min-h-11 w-fit items-center self-end rounded-lg border border-vault-hairline px-3 text-sm font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
        >
          {t('clearSide')}
        </button>
      )}
    </section>
  );
}
