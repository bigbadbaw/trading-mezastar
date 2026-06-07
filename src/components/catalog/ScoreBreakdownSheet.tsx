'use client';

import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { ScoreBreakdown } from '@/data/catalog';

import { ScoreBreakdownTable } from './ScoreBreakdownTable';

interface Props {
  score: ScoreBreakdown;
  open: boolean;
  onClose: () => void;
}

/**
 * Score breakdown overlay: bottom-sheet slide-up below 520px, centered dialog
 * at ≥520px. Traps focus while open and restores on close.
 */
export function ScoreBreakdownSheet({ score, open, onClose }: Props) {
  const t = useTranslations('compare');
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center min-[520px]:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-vault-bg/70"
        aria-label={t('closeBreakdown')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl border border-vault-hairline motion-safe:animate-[slideUp_0.25s_ease-out] min-[520px]:max-h-[80dvh] min-[520px]:rounded-2xl min-[520px]:motion-safe:animate-[fadeIn_0.2s_ease-out]"
        style={{ backgroundColor: 'var(--panel-fill)' }}
      >
        <div className="flex items-center justify-between border-b border-vault-hairline px-4 py-3">
          <h2 id={titleId} className="font-display text-lg font-bold text-vault-text">
            {t('breakdownTitle')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-vault-hairline text-lg text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
            aria-label={t('closeBreakdown')}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">
          <ScoreBreakdownTable score={score} />
        </div>
      </div>
    </div>
  );
}
