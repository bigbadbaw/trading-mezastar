import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { TagDetailContent } from '@/components/catalog/TagDetailContent';
import { getScoredCatalog, getScoredTag, type ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getScoredCatalog().map(({ tag }) => ({ locale, tagId: tag.tagId })),
  );
}

export default function TagDetailPage({
  params,
}: {
  params: { locale: string; tagId: string };
}) {
  setRequestLocale(params.locale);
  const entry = getScoredTag(params.tagId);
  if (!entry) notFound();
  return <TagDetail entry={entry} locale={params.locale} />;
}

function TagDetail({ entry, locale }: { entry: ScoredTag; locale: string }) {
  const t = useTranslations('catalog');

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/catalog"
        className="inline-flex min-h-11 items-center text-sm font-medium text-vault-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      >
        ← {t('backToCatalog')}
      </Link>

      <div className="mt-4">
        <TagDetailContent entry={entry} locale={locale} />
      </div>
    </main>
  );
}
