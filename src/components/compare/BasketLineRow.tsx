'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ScoreBreakdownTable } from '@/components/catalog/ScoreBreakdownTable';
import type { ScoredLine } from '@/lib/compare/basket';
import { gradeBadgeClass } from '@/lib/pokemon-types';
import { isUnconfirmed } from '@/lib/tag-display';

interface Props {
  line: ScoredLine;
  locale: string;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
}

/**
 * One tag in a basket: identity by `tag.tagId`. Shows the dual-tag and
 * unverified-price badges exactly as the catalog does, a quantity stepper, and
 * an expandable reuse of the M3 `ScoreBreakdownTable` (never recomputed).
 */
export function BasketLineRow({ line, locale, onSetQuantity, onRemove }: Props) {
  const t = useTranslations('compare');
  const tCatalog = useTranslations('catalog');
  const tCollection = useTranslations('collection');
  const [open, setOpen] = useState(false);
  const { entry, quantity, lineTotal } = line;
  const { tag, score } = entry;
  const dual = tag.species.length === 2;
  const unconfirmed = isUnconfirmed(tag);

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none" role="img" aria-label={tag.nameEn}>
          {tag.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-slate-900">{tag.nameEn}</p>
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-bold ${gradeBadgeClass(score.grade.grade)}`}
            >
              {score.grade.grade} · {score.total}
            </span>
          </div>
          <p className="truncate text-sm text-slate-500">{tag.nameZh}</p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {dual && (
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-800">
                {t('dualTag')}
              </span>
            )}
            {unconfirmed && (
              <span
                className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                title={tCatalog('unverifiedTitle', { confidence: tag.priceConfidence })}
              >
                {tCatalog('unverified')}
              </span>
            )}
            <span className="text-sm tabular-nums text-slate-600">
              {t('lineTotal', { score: score.total, quantity })} ={' '}
              <span className="font-semibold text-slate-900">{lineTotal}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={t('remove')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-lg text-slate-500 hover:border-red-400 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label={tCollection('decrement')}
            onClick={() => onSetQuantity(Math.max(0, quantity - 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-medium text-slate-700 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            −
          </button>
          <span className="min-w-8 text-center text-base font-medium tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={tCollection('increment')}
            onClick={() => onSetQuantity(quantity + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-medium text-slate-700 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            +
          </button>
        </div>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {open ? t('hideBreakdown') : t('showBreakdown')}
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <ScoreBreakdownTable score={score} />
        </div>
      )}
    </li>
  );
}
