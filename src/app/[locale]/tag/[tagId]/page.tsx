import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ScoreBreakdownTable } from '@/components/catalog/ScoreBreakdownTable';
import { TagImage } from '@/components/catalog/TagImage';
import { TypeBadge } from '@/components/catalog/TypeBadge';
import { CollectionControls } from '@/components/collection/CollectionControls';
import { getScoredCatalog, getScoredTag, type ScoredTag } from '@/data/catalog';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { gradeBadgeClass } from '@/lib/pokemon-types';
import { isUnconfirmed, tagLabelParts, zhEnrichment } from '@/lib/tag-display';

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
  const { tag, pack, score } = entry;
  const t = useTranslations('catalog');
  const tScoring = useTranslations('scoring');
  const tTier = useTranslations('gradeTier');
  const parts = tagLabelParts(tag);
  const zh = zhEnrichment(tag, locale);
  const unconfirmed = isUnconfirmed(tag);
  const [low, high] = tag.price;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/catalog"
        className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        ← {t('backToCatalog')}
      </Link>

      <header className="mt-4 flex items-start gap-4">
        <TagImage
          tagId={tag.tagId}
          emoji={tag.emoji}
          nameEn={tag.nameEn}
          imgClassName="h-16 w-16 rounded object-contain"
          emojiClassName="text-6xl leading-none"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{tag.nameEn}</h1>
          <p className="text-lg text-slate-500">{tag.nameZh}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {tag.tagId} · {locale === 'zh-TW' ? pack.name.zh : pack.name.en}
          </p>
        </div>
        <span
          className={`inline-flex flex-col items-center rounded-lg px-3 py-2 text-center font-bold ${gradeBadgeClass(score.grade.grade)}`}
        >
          <span className="text-2xl leading-none">{score.grade.grade}</span>
          <span className="text-sm tabular-nums">{score.total}</span>
        </span>
      </header>

      <section className="mt-6 flex flex-wrap items-center gap-2 text-base text-slate-700">
        <span className="font-semibold text-amber-600">{parts.gradeStars}</span>
        <span>·</span>
        <span>{tTier(tag.gradeTier)}</span>
        <span>·</span>
        <span>
          {t('energy')}: <span className="font-medium tabular-nums">{tag.energy}</span>
        </span>
      </section>

      <section className="mt-3 flex flex-wrap gap-1.5">
        {tag.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </section>

      <section className="mt-4 text-base text-slate-700">
        <span className="font-medium">{t('price')}:</span>{' '}
        <span className="tabular-nums">NT${low}–{high}</span>
        {unconfirmed && (
          <span
            className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-sm font-medium text-amber-800"
            title={t('unverifiedTitle', { confidence: tag.priceConfidence })}
          >
            {t('unverified')}
          </span>
        )}
      </section>

      <section className="mt-2 text-base text-slate-700">
        <span className="font-medium">{tScoring('species')}:</span> {tag.species.join(' / ')}
      </section>

      {zh && <p className="mt-2 text-sm text-slate-400">{zh}</p>}

      <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <CollectionControls tagId={tag.tagId} />
      </section>

      <section className="mt-8">
        <ScoreBreakdownTable score={score} />
      </section>
    </main>
  );
}
