'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

type Phase = 'idle' | 'sending' | 'sent' | 'error';

export function SignInForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setPhase('sending');

    const supabase = createClient();
    const next = `/${locale}/catalog`;
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo },
    });

    setPhase(error ? 'error' : 'sent');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('signInTitle')}</h1>
        <p className="mt-2 text-base text-slate-600">{t('signInIntro')}</p>
      </div>

      {phase === 'sent' ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-base text-green-800"
        >
          {t('linkSent', { email: email.trim() })}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              {t('emailLabel')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            />
          </div>

          {phase === 'error' && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {t('sendError')}
            </p>
          )}

          <button
            type="submit"
            disabled={phase === 'sending'}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-base font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === 'sending' ? t('sending') : t('sendLink')}
          </button>
        </form>
      )}

      <Link
        href="/catalog"
        className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        ← {t('backToCatalog')}
      </Link>
    </main>
  );
}
