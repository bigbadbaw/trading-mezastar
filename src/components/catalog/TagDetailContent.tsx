import { useTranslations } from 'next-intl';

import { ScoreBreakdownTable } from '@/components/catalog/ScoreBreakdownTable';
import { TagImage } from '@/components/catalog/TagImage';
import { TypeBadge } from '@/components/catalog/TypeBadge';
import { CollectionControls } from '@/components/collection/CollectionControls';
import type { ScoredTag } from '@/data/catalog';
import { gradeTierStyle } from '@/lib/grade-tier-styles';
import { gradeBadgeClass } from '@/lib/pokemon-types';
import { isUnconfirmed, zhEnrichment } from '@/lib/tag-display';

import { GradeBadge } from './GradeBadge';

/**
 * The shared tag-detail body, rendered identically by the full-page route and
 * the route-backed modal overlay. Shows the data kept off the (sparse) card:
 * Energy, the NT$ price range + unverified badge, and the transparent score
 * breakdown. The collectible Grade is shown via {@link GradeBadge} so Special
 * tags read as "Special" instead of a misleading ★5 (display only).
 */
export function TagDetailContent({
  entry,
  locale,
}: {
  entry: ScoredTag;
  locale: string;
}) {
  const { tag, pack, score } = entry;
  const t = useTranslations('catalog');
  const tScoring = useTranslations('scoring');
  const tTier = useTranslations('gradeTier');
  const zh = zhEnrichment(tag, locale);
  const unconfirmed = isUnconfirmed(tag);
  const isSpecial = tag.gradeTier === 'special';
  const [low, high] = tag.price;
  const tierStyle = gradeTierStyle(tag.gradeTier);

  return (
    <>
      <header>
        {/* Hero art — focal point of the detail view. */}
        <div
          className={`flex justify-center rounded-xl border-2 p-8 ${tierStyle.borderClass} ${tierStyle.glow}`}
          style={{ backgroundColor: 'var(--panel-fill)' }}
        >
          <TagImage
            tagId={tag.tagId}
            emoji={tag.emoji}
            nameEn={tag.nameEn}
            imgClassName="h-48 w-auto object-contain"
            emojiClassName="text-9xl leading-none"
          />
        </div>

        {/* Title + score grade below art. */}
        <div className="mt-4 flex items-start gap-4">
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-vault-text">{tag.nameEn}</h1>
            <p className="text-lg text-vault-muted">{tag.nameZh}</p>
            <p className="mt-1 text-sm text-vault-muted">
              <span className="font-mono text-vault-mono-green">{tag.num}</span>
              <span className="mx-1.5 text-vault-dim">·</span>
              <span>{locale === 'zh-TW' ? pack.name.zh : pack.name.en}</span>
            </p>
          </div>
          <span
            className={`inline-flex flex-col items-center rounded-lg px-3 py-2 text-center font-mono font-bold ${gradeBadgeClass(score.grade.grade)}`}
          >
            <span className="text-2xl leading-none">{score.grade.grade}</span>
            <span className="text-sm tabular-nums">{score.total}</span>
          </span>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-center gap-2 text-base text-vault-muted">
        <GradeBadge tag={tag} />
        {!isSpecial && (
          <>
            <span>·</span>
            <span>{tTier(tag.gradeTier)}</span>
          </>
        )}
        <span>·</span>
        <span>
          {t('energy')}: <span className="font-mono font-medium tabular-nums">{tag.energy}</span>
        </span>
      </section>

      <section className="mt-3 flex flex-wrap gap-1.5">
        {tag.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </section>

      <section className="mt-4 text-base text-vault-muted">
        <span className="font-medium">{t('price')}:</span>{' '}
        <span className="font-mono tabular-nums">NT${low}–{high}</span>
        {unconfirmed && (
          <span
            className="ml-2 rounded bg-status-slight/20 px-1.5 py-0.5 text-sm font-medium text-status-slight"
            title={t('unverifiedTitle', { confidence: tag.priceConfidence })}
          >
            {t('unverified')}
          </span>
        )}
      </section>

      <section className="mt-2 text-base text-vault-muted">
        <span className="font-medium">{tScoring('species')}:</span> {tag.species.join(' / ')}
      </section>

      {zh && <p className="mt-2 text-sm text-vault-dim">{zh}</p>}

      <section
        className="mt-6 rounded-xl border border-vault-hairline p-4"
        style={{ backgroundColor: 'var(--panel-fill)' }}
      >
        <CollectionControls tagId={tag.tagId} />
      </section>

      <section className="mt-8">
        <ScoreBreakdownTable score={score} />
      </section>
    </>
  );
}
