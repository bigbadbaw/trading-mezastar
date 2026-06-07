'use client';

import { useTranslations } from 'next-intl';

import { CollectionControls } from '@/components/collection/CollectionControls';
import { useCollection } from '@/components/collection/CollectionProvider';
import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import {
  gradeTierStyle,
  UNOWNED_DESATURATE_CLASS,
} from '@/lib/grade-tier-styles';
import { gradeBadgeClass } from '@/lib/pokemon-types';
import { isUnconfirmed, tagLabelParts, zhEnrichment } from '@/lib/tag-display';

import { TagImage } from './TagImage';
import { TypeBadge } from './TypeBadge';

/** A single catalog card. Links to the detail view keyed by the stable tagId. */
export function TagCard({ entry, locale }: { entry: ScoredTag; locale: string }) {
  const { tag, score } = entry;
  const t = useTranslations('catalog');
  const tTier = useTranslations('gradeTier');
  const tScoring = useTranslations('scoring');
  const { user, items } = useCollection();
  const parts = tagLabelParts(tag);
  const zh = zhEnrichment(tag, locale);
  const unconfirmed = isUnconfirmed(tag);
  const [low, high] = tag.price;

  const isOwned = user !== null && items.get(tag.tagId)?.status === 'owned';
  const withGlow = isOwned;
  const tierStyle = gradeTierStyle(tag.gradeTier, withGlow);
  const desaturate = user !== null && !isOwned;

  return (
    <div
      className={`flex flex-col rounded-xl border-2 bg-vault-panel transition focus-within:border-vault-gold hover:border-vault-gold ${tierStyle.borderClass} ${tierStyle.glow} ${desaturate ? UNOWNED_DESATURATE_CLASS : ''}`}
    >
      <Link
        href={`/tag/${encodeURIComponent(tag.tagId)}`}
        className="flex flex-1 flex-col rounded-t-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vault-gold"
      >
        {/* Art header — prominent, iPad-first */}
        <div
          className={`relative flex items-center justify-center rounded-t-xl py-5 ${tierStyle.fillClass}`}
          style={{ backgroundColor: 'var(--panel-fill)' }}
        >
          <TagImage
            tagId={tag.tagId}
            emoji={tag.emoji}
            nameEn={tag.nameEn}
            imgClassName="h-28 w-auto object-contain"
            emojiClassName="text-7xl leading-none"
          />
          <span
            className={`absolute right-2 top-2 inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 font-mono text-sm font-bold ${gradeBadgeClass(score.grade.grade)}`}
            title={tScoring('total')}
          >
            {score.grade.grade} · {score.total}
          </span>
          <span className="absolute left-2 top-2 font-mono text-xs text-vault-mono-green">
            {tag.num}
          </span>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <p className="font-display text-base font-semibold text-vault-text">{tag.nameEn}</p>
            <p className="text-sm text-vault-muted">{tag.nameZh}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-sm text-vault-muted">
            <span className="font-medium text-vault-gold">{parts.gradeStars}</span>
            <span>·</span>
            <span>{tTier(tag.gradeTier)}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tag.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-sm text-vault-muted">
            <span>
              {t('energy')}: <span className="font-mono font-medium tabular-nums">{tag.energy}</span>
            </span>
            <span className="font-mono tabular-nums">
              NT${low}–{high}
              {unconfirmed && (
                <span
                  className="ml-1 rounded bg-status-slight/20 px-1 font-sans text-xs font-medium text-status-slight"
                  title={t('unverifiedTitle', { confidence: tag.priceConfidence })}
                >
                  {t('unverified')}
                </span>
              )}
            </span>
          </div>

          {zh && <p className="text-xs text-vault-dim">{zh}</p>}
        </div>
      </Link>

      <div className="border-t border-vault-hairline p-3">
        <CollectionControls tagId={tag.tagId} />
      </div>
    </div>
  );
}
