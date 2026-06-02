import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

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
    </main>
  );
}
