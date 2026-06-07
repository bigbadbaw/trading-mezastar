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
        <h1 className="font-display text-2xl font-bold text-vault-text">{t('signInTitle')}</h1>
        <p className="mt-2 text-base text-vault-muted">{t('signInIntro')}</p>
      </div>

      {phase === 'sent' ? (
        <div
          role="status"
          className="rounded-lg border border-status-fair/50 bg-status-fair/10 p-4 text-base text-vault-text"
        >
          {t('linkSent', { email: email.trim() })}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-vault-text">
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
              className="min-h-11 rounded-lg border border-vault-hairline bg-vault-bg px-3 text-base text-vault-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
            />
          </div>

          {phase === 'error' && (
            <p role="alert" className="text-sm font-medium text-status-unfair">
              {t('sendError')}
            </p>
          )}

          <button
            type="submit"
            disabled={phase === 'sending'}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-vault-gold bg-vault-gold px-4 text-base font-medium text-vault-bg hover:bg-vault-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === 'sending' ? t('sending') : t('sendLink')}
          </button>
        </form>
      )}

      <Link
        href="/catalog"
        className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-vault-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
      >
        ← {t('backToCatalog')}
      </Link>
    </main>
  );
}
