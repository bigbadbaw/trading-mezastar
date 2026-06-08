'use client';

import { CollectionControls } from '@/components/collection/CollectionControls';
import { useCollection } from '@/components/collection/CollectionProvider';
import type { ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import {
  gradeTierStyle,
  UNOWNED_DESATURATE_CLASS,
} from '@/lib/grade-tier-styles';

import { GradeBadge } from './GradeBadge';
import { TagImage } from './TagImage';
import { TypeBadge } from './TypeBadge';

/**
 * A single catalog card — horizontal, art-forward (Option B): a prominent art
 * panel on the left and a sparse info column on the right. The card face shows
 * only name + grade badge + types up top and the status/qty action zone below;
 * Energy, price, and the score breakdown live in the detail view. Tapping the
 * art or the name opens the route-backed detail (keyed by the stable tagId).
 */
export function TagCard({ entry, locale }: { entry: ScoredTag; locale: string }) {
  const { tag } = entry;
  const { user, items } = useCollection();

  const name = locale === 'zh-TW' ? tag.nameZh : tag.nameEn;
  const detailHref = `/tag/${encodeURIComponent(tag.tagId)}`;

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
        </Link>

        {/* Status / quantity action zone. */}
        <div className="mt-auto pt-1">
          <CollectionControls tagId={tag.tagId} />
        </div>
      </div>
    </div>
  );
}
