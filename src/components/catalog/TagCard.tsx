'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { CollectionControls } from '@/components/collection/CollectionControls';
import { useCollection } from '@/components/collection/CollectionProvider';
import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import {
  deriveCardScore,
  type CardMarketParity,
} from '@/lib/catalog-card-score';
import { buildCatalogTagHref } from '@/lib/catalog-filters';
import {
  gradeTierStyle,
  UNOWNED_DESATURATE_CLASS,
} from '@/lib/grade-tier-styles';

import { GradeBadge } from './GradeBadge';
import { TagImage } from './TagImage';
import { TypeBadge } from './TypeBadge';

/** Compact market-parity glyph + color, reusing the two-axis verdict semantics:
 *  parity reads as the green "agree" signal, divergence as the blue signal. */
const PARITY_PRESENTATION: Record<
  CardMarketParity,
  { glyph: string; colorClass: string; labelKey: string }
> = {
  even: { glyph: '≈', colorClass: 'text-status-fair', labelKey: 'parityEven' },
  'market-rich': { glyph: '↑', colorClass: 'text-status-diverge', labelKey: 'parityMarketRich' },
  'market-poor': { glyph: '↓', colorClass: 'text-status-diverge', labelKey: 'parityMarketPoor' },
};

/**
 * A single catalog card — horizontal, art-forward (Option B): a prominent art
 * panel on the left and a sparse info column on the right. The card face shows
 * name + grade badge + types and a compact two-axis score (collector value +
 * market parity); Energy and the full breakdown live in the detail view.
 *
 * Tapping the art or the info opens the detail as an overlay by layering a
 * `?tag=<id>` param onto the live catalog URL (filters preserved, shareable,
 * back-button closeable) — NOT a full-page navigation.
 */
export function TagCard({ entry, locale }: { entry: ScoredTag; locale: string }) {
  const { tag, score } = entry;
  const t = useTranslations('catalog');
  const { user, items } = useCollection();
  const searchParams = useSearchParams();

  const name = locale === 'zh-TW' ? tag.nameZh : tag.nameEn;
  const detailHref = buildCatalogTagHref(searchParams, tag.tagId);

  const cardScore = deriveCardScore(score);
  const parity = PARITY_PRESENTATION[cardScore.marketParity];

  const isOwned = user !== null && items.get(tag.tagId)?.status === 'owned';
  const tierStyle = gradeTierStyle(tag.gradeTier, isOwned);
  const desaturate = user !== null && !isOwned;

  return (
    <div
      className={`flex overflow-hidden rounded-xl border-2 bg-vault-panel transition focus-within:border-vault-gold hover:border-vault-gold ${tierStyle.borderClass} ${tierStyle.glow}`}
    >
      {/* Art panel — left ~40%, full card height, prominent. */}
      <Link
        href={detailHref}
        scroll={false}
        className={`relative flex w-2/5 shrink-0 items-center justify-center self-stretch p-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vault-gold ${tierStyle.fillClass} ${desaturate ? UNOWNED_DESATURATE_CLASS : ''}`}
        style={{ backgroundColor: 'var(--panel-fill)' }}
      >
        <TagImage
          tagId={tag.tagId}
          emoji={tag.emoji}
          nameEn={tag.nameEn}
          imgClassName="h-28 w-auto max-w-full object-contain"
          emojiClassName="text-7xl leading-none"
        />
        <span className="absolute left-2 top-2 font-mono text-xs text-vault-mono-green">
          {tag.num}
        </span>
      </Link>

      {/* Info column — right ~60%. */}
      <div className="flex w-3/5 flex-col gap-3 p-4">
        <Link
          href={detailHref}
          scroll={false}
          className="flex flex-col gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-base font-semibold leading-tight text-vault-text">
              {name}
            </p>
            <GradeBadge tag={tag} className="shrink-0" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tag.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>

          {/* Two-axis score, compact: collector value + market parity readout. */}
          <div className="flex items-center justify-between gap-2 pt-0.5 text-sm">
            <span className="flex items-baseline gap-1">
              <span className="text-xs uppercase tracking-wide text-vault-muted">
                {t('collectorScore')}
              </span>
              <span className="font-mono font-semibold tabular-nums text-vault-text">
                {cardScore.collector}
              </span>
            </span>
            <span
              className="flex items-center gap-1 font-mono tabular-nums"
              title={t(parity.labelKey)}
            >
              <span className={parity.colorClass} aria-hidden>
                {parity.glyph}
              </span>
              <span
                className={cardScore.marketUnverified ? 'text-status-slight' : 'text-vault-muted'}
              >
                NT${cardScore.marketPrice}
              </span>
              <span className="sr-only">{t(parity.labelKey)}</span>
            </span>
          </div>
        </Link>

        {/* Status / quantity action zone. */}
        <div className="mt-auto pt-1">
          <CollectionControls tagId={tag.tagId} />
        </div>
      </div>
    </div>
  );
}
