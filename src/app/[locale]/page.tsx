import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <Home />;
}

function Home() {
  const t = useTranslations('home');
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-2xl font-bold text-vault-text">{t('title')}</h1>
      <p className="text-base text-vault-muted">{t('tagline')}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/compare"
          className="inline-flex min-h-11 w-fit items-center rounded-lg border border-vault-gold bg-vault-gold px-4 text-base font-medium text-vault-bg hover:bg-vault-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
        >
          {t('viewCompare')}
        </Link>
        <Link
          href="/catalog"
          className="inline-flex min-h-11 w-fit items-center rounded-lg border border-vault-hairline px-4 text-base font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
        >
          {t('viewCatalog')}
        </Link>
      </div>
    </main>
  );
}
