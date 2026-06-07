'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ScoreBreakdownSheet } from '@/components/catalog/ScoreBreakdownSheet';
import { TagImage } from '@/components/catalog/TagImage';
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
 * a sheet modal reuse of the M3 `ScoreBreakdownTable` (never recomputed).
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
    <li
      className="rounded-lg border border-vault-hairline p-3"
      style={{ backgroundColor: 'var(--panel-fill)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--vault-bg)' }}
        >
          <TagImage
            tagId={tag.tagId}
            emoji={tag.emoji}
            nameEn={tag.nameEn}
            imgClassName="h-20 w-auto object-contain"
            emojiClassName="text-6xl leading-none"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-base font-semibold text-vault-text">
              {tag.nameEn}
            </p>
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${gradeBadgeClass(score.grade.grade)}`}
            >
              {score.grade.grade} · {score.total}
            </span>
          </div>
          <p className="truncate text-sm text-vault-muted">{tag.nameZh}</p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {dual && (
              <span className="rounded bg-status-diverge/20 px-1.5 py-0.5 text-xs font-medium text-status-diverge">
                {t('dualTag')}
              </span>
            )}
            {unconfirmed && (
              <span
                className="rounded bg-status-slight/20 px-1.5 py-0.5 text-xs font-medium text-status-slight"
                title={tCatalog('unverifiedTitle', { confidence: tag.priceConfidence })}
              >
                {tCatalog('unverified')}
              </span>
            )}
            <span className="font-mono text-sm tabular-nums text-vault-muted">
              {t('lineTotal', { score: score.total, quantity })} ={' '}
              <span className="font-semibold text-vault-text">{lineTotal}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={t('remove')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-vault-hairline text-lg text-vault-muted hover:border-status-unfair hover:text-status-unfair focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-vault-hairline text-lg font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          >
            −
          </button>
          <span className="min-w-8 text-center font-mono text-base font-medium tabular-nums text-vault-text" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={tCollection('increment')}
            onClick={() => onSetQuantity(quantity + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-vault-hairline text-lg font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          >
            +
          </button>
        </div>

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-vault-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
        >
          {t('showBreakdown')}
        </button>
      </div>

      <ScoreBreakdownSheet score={score} open={open} onClose={() => setOpen(false)} />
    </li>
  );
}
