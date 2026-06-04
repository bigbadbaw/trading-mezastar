'use client';

import { useTranslations } from 'next-intl';

import type { ComparisonResult } from '@/lib/compare/basket';

const VERDICT_META: Record<
  ComparisonResult['verdict']['verdict'],
  { labelKey: 'verdictFair' | 'verdictSlight' | 'verdictUnfair'; box: string }
> = {
  fair: { labelKey: 'verdictFair', box: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  slight: { labelKey: 'verdictSlight', box: 'border-amber-300 bg-amber-50 text-amber-900' },
  unfair: { labelKey: 'verdictUnfair', box: 'border-red-300 bg-red-50 text-red-900' },
};

/**
 * Renders the engine's verdict prominently, the transparent "why" (score gap +
 * which side is richer), and — clearly separated — the market-anchored cash
 * top-up derived from the price gap (M2-spec §2f), never from the score.
 */
export function VerdictPanel({ result }: { result: ComparisonResult }) {
  const t = useTranslations('compare');
  const { verdict } = result;
  const meta = VERDICT_META[verdict.verdict];

  const richerKey =
    verdict.richerSide === 'left'
      ? 'richerMine'
      : verdict.richerSide === 'right'
        ? 'richerTheirs'
        : 'richerEqual';

  const topUpAmount = Math.round(verdict.priceGap);
  const topUpText =
    verdict.payingSide === 'left'
      ? t('topUpMine', { amount: topUpAmount })
      : verdict.payingSide === 'right'
        ? t('topUpTheirs', { amount: topUpAmount })
        : t('topUpNone');

  return (
    <section aria-label={t('verdictHeading')} className={`rounded-xl border-2 p-5 ${meta.box}`}>
      <p className="text-sm font-medium uppercase tracking-wide opacity-70">
        {t('verdictHeading')}
      </p>
      <p className="mt-1 text-3xl font-extrabold">{t(meta.labelKey)}</p>

      <div className="mt-3 space-y-1 text-base">
        <p className="tabular-nums">
          {t('whyDiff', { diff: verdict.diff, pct: Math.round(verdict.pctDiff) })}
        </p>
        <p className="font-medium">{t(richerKey)}</p>
      </div>

      <div className="mt-4 rounded-lg border border-black/10 bg-white/60 p-3">
        <p className="text-sm font-semibold">{t('topUpHeading')}</p>
        <p className="mt-0.5 text-base tabular-nums">{topUpText}</p>
        <p className="mt-1 text-xs opacity-70">{t('topUpNote')}</p>
      </div>
    </section>
  );
}
