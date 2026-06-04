import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { TradeComparator } from '@/components/compare/TradeComparator';
import { getScoredCatalog } from '@/data/catalog';

export default function ComparePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <Compare locale={params.locale} />;
}

function Compare({ locale }: { locale: string }) {
  const t = useTranslations('compare');
  const entries = getScoredCatalog();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
      <p className="mb-8 mt-1 text-base text-slate-600">{t('subtitle')}</p>
      <TradeComparator entries={entries} locale={locale} />
    </main>
  );
}
