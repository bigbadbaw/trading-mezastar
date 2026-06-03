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
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-base text-gray-600">{t('tagline')}</p>
      <Link
        href="/catalog"
        className="inline-flex min-h-11 w-fit items-center rounded-lg bg-blue-600 px-4 text-base font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {t('viewCatalog')}
      </Link>
    </main>
  );
}
