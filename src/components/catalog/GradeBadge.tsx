import { useTranslations } from 'next-intl';

import type { Tag } from '@/data/schema';
import { gradeTierStyle } from '@/lib/grade-tier-styles';

/**
 * The collectible Grade badge, rendered in gem-tier chrome.
 *
 * DISPLAY ONLY. Special/event tags carry a synthetic `grade: 5` internally (it
 * still feeds scoring untouched); here we stop SHOWING them a numeric "★5" and
 * render a "Special" event badge instead. Identified by `gradeTier === 'special'`
 * — no data, schema, or scoring change. See `de-conflate Special tags`.
 */
export function GradeBadge({
  tag,
  className,
}: {
  tag: Pick<Tag, 'grade' | 'gradeTier'>;
  className?: string;
}) {
  const tTier = useTranslations('gradeTier');
  const isSpecial = tag.gradeTier === 'special';
  const style = gradeTierStyle(tag.gradeTier);
  // Reuse the existing gradeTier.special i18n key — no new hardcoded string.
  const label = isSpecial ? tTier('special') : `★${tag.grade}`;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-bold ${style.badgeClass} ${className ?? ''}`}
    >
      {label}
    </span>
  );
}
