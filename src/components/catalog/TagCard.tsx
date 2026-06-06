import { useTranslations } from 'next-intl';

import { CollectionControls } from '@/components/collection/CollectionControls';
import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
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
  const parts = tagLabelParts(tag);
  const zh = zhEnrichment(tag, locale);
  const unconfirmed = isUnconfirmed(tag);
  const [low, high] = tag.price;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white transition focus-within:border-slate-400 hover:border-slate-400">
      <Link
        href={`/tag/${encodeURIComponent(tag.tagId)}`}
        className="flex flex-1 flex-col rounded-t-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
      >
        {/* Art header — prominent, iPad-first */}
        <div className="relative flex items-center justify-center rounded-t-xl bg-slate-50 py-5">
          <TagImage
            tagId={tag.tagId}
            emoji={tag.emoji}
            nameEn={tag.nameEn}
            imgClassName="h-28 w-auto object-contain"
            emojiClassName="text-7xl leading-none"
          />
          <span
            className={`absolute right-2 top-2 inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 text-sm font-bold ${gradeBadgeClass(score.grade.grade)}`}
            title={tScoring('total')}
          >
            {score.grade.grade} · {score.total}
          </span>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <p className="text-base font-semibold text-slate-900">{tag.nameEn}</p>
            <p className="text-sm text-slate-500">{tag.nameZh}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
            <span className="font-medium text-amber-600">{parts.gradeStars}</span>
            <span>·</span>
            <span>{tTier(tag.gradeTier)}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tag.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-sm text-slate-600">
            <span>
              {t('energy')}: <span className="font-medium tabular-nums">{tag.energy}</span>
            </span>
            <span className="tabular-nums">
              NT${low}–{high}
              {unconfirmed && (
                <span
                  className="ml-1 rounded bg-amber-100 px-1 text-xs font-medium text-amber-800"
                  title={t('unverifiedTitle', { confidence: tag.priceConfidence })}
                >
                  {t('unverified')}
                </span>
              )}
            </span>
          </div>

          {zh && <p className="text-xs text-slate-400">{zh}</p>}
        </div>
      </Link>

      <div className="border-t border-slate-100 p-3">
        <CollectionControls tagId={tag.tagId} />
      </div>
    </div>
  );
}
