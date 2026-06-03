import { useTranslations } from 'next-intl';

import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import { gradeBadgeClass } from '@/lib/pokemon-types';
import { isUnconfirmed, tagLabelParts, zhEnrichment } from '@/lib/tag-display';

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
    <Link
      href={`/tag/${encodeURIComponent(tag.tagId)}`}
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-4xl leading-none" role="img" aria-label={tag.nameEn}>
          {tag.emoji}
        </span>
        <span
          className={`inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 text-sm font-bold ${gradeBadgeClass(score.grade.grade)}`}
          title={tScoring('total')}
        >
          {score.grade.grade} · {score.total}
        </span>
      </div>

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
    </Link>
  );
}
