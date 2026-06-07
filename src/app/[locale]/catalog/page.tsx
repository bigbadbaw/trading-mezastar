import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { getCatalogPacks, getScoredCatalog } from '@/data/catalog';

export default function CatalogPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <Catalog locale={params.locale} />;
}

function Catalog({ locale }: { locale: string }) {
  const t = useTranslations('catalog');
  const entries = getScoredCatalog();
  const packs = getCatalogPacks();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-vault-text">{t('title')}</h1>
      <p className="mb-8 mt-1 text-base text-vault-muted">{t('subtitle')}</p>
      <CatalogBrowser entries={entries} packs={packs} locale={locale} />
    </main>
  );
}
