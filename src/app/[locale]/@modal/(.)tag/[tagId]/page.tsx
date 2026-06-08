import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { TagDetailContent } from '@/components/catalog/TagDetailContent';
import { TagDetailModal } from '@/components/catalog/TagDetailModal';
import { getScoredTag } from '@/data/catalog';

/**
 * Intercepting route for `[locale]/tag/[tagId]`. Triggered ONLY by in-app
 * client navigation (e.g. tapping a catalog card): renders the detail as an
 * overlay over the still-mounted catalog. A direct load / refresh of the URL
 * is NOT intercepted and falls through to the full-page route, with this slot
 * resolving to its `default` (null).
 */
export default function InterceptedTagDetail({
  params,
}: {
  params: { locale: string; tagId: string };
}) {
  setRequestLocale(params.locale);
  const entry = getScoredTag(params.tagId);
  if (!entry) notFound();

  return (
    <TagDetailModal>
      <TagDetailContent entry={entry} locale={params.locale} />
    </TagDetailModal>
  );
}
