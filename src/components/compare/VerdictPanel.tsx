'use client';

import { useTranslations } from 'next-intl';

import type { ComparisonResult } from '@/lib/compare/basket';
import { deriveVerdictAxes, type VerdictAxes } from '@/lib/compare/verdict-axes';

const VERDICT_META: Record<
  ComparisonResult['verdict']['verdict'],
  { labelKey: 'verdictFair' | 'verdictSlight' | 'verdictUnfair'; box: string }
> = {
  fair: { labelKey: 'verdictFair', box: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  slight: { labelKey: 'verdictSlight', box: 'border-amber-300 bg-amber-50 text-amber-900' },
  unfair: { labelKey: 'verdictUnfair', box: 'border-red-300 bg-red-50 text-red-900' },
};

/** Synthesis-banner styling per agreement state — DIVERGE is informative, never an error. */
const STATE_BOX: Record<VerdictAxes['agreement'], string> = {
  agree: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  diverge: 'border-blue-300 bg-blue-50 text-blue-900',
  reinforce: 'border-amber-300 bg-amber-50 text-amber-900',
};

/** Pick the synthesis message key for the two-axis state (total over all cases). */
function synthesisKey(axes: VerdictAxes): string {
  if (axes.agreement === 'agree') return 'stateAgree';
  if (axes.agreement === 'reinforce') {
    return axes.scoreDirection === 'mine' ? 'stateReinforceMine' : 'stateReinforceTheirs';
  }
  // DIVERGE: the two directions always differ, so exactly one branch matches.
  if (axes.scoreDirection === 'even') {
    return axes.marketDirection === 'mine'
      ? 'divergeScoreEvenMarketMine'
      : 'divergeScoreEvenMarketTheirs';
  }
  if (axes.marketDirection === 'even') {
    return axes.scoreDirection === 'mine'
      ? 'divergeMarketEvenScoreMine'
      : 'divergeMarketEvenScoreTheirs';
  }
  return axes.scoreDirection === 'mine' ? 'divergeOppositeScoreMine' : 'divergeOppositeScoreTheirs';
}

/**
 * Two co-equal verdict axes (2026-06-05 fork): the collector-value verdict a kid
 * reads, beside the market-anchored cash an adult reads. A synthesis banner names
 * the relationship (AGREE / DIVERGE / REINFORCE); divergence reads as informative
 * signal, not an error. The cash gap is reused from the engine (M2-spec §2f),
 * never recomputed, and is flagged when it leans on unverified prices.
 */
export function VerdictPanel({ result }: { result: ComparisonResult }) {
  const t = useTranslations('compare');
  const { verdict } = result;
  const axes = deriveVerdictAxes(result);
  const meta = VERDICT_META[verdict.verdict];

  const richerKey =
    verdict.verdict === 'fair'
      ? 'richerFair'
      : verdict.richerSide === 'left'
        ? 'richerMine'
        : verdict.richerSide === 'right'
          ? 'richerTheirs'
          : 'richerEqual';

  const gapKey =
    axes.marketDirection === 'mine'
      ? 'marketGapMine'
      : axes.marketDirection === 'theirs'
        ? 'marketGapTheirs'
        : 'marketGapEven';

  const topUpKey =
    verdict.payingSide === 'left'
      ? 'topUpMine'
      : verdict.payingSide === 'right'
        ? 'topUpTheirs'
        : 'topUpNone';

  return (
    <section aria-label={t('verdictHeading')} className="flex flex-col gap-4">
      <p
        className={`rounded-xl border-2 p-4 text-lg font-bold ${STATE_BOX[axes.agreement]}`}
        role="status"
      >
        {t(synthesisKey(axes), { amount: axes.marketGap })}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Collector value — the headline a kid reads. */}
        <div className={`rounded-xl border-2 p-5 ${meta.box}`}>
          <p className="text-sm font-medium uppercase tracking-wide opacity-70">
            {t('axisCollector')}
          </p>
          <p className="mt-1 text-3xl font-extrabold">{t(meta.labelKey)}</p>
          <div className="mt-3 space-y-1 text-base">
            <p className="tabular-nums">
              {t('whyDiff', { diff: verdict.diff, pct: Math.round(verdict.pctDiff) })}
            </p>
            <p className="font-medium">{t(richerKey)}</p>
          </div>
        </div>

        {/* Market value — a clearly-labeled cash figure an adult reads. */}
        <div className="rounded-xl border-2 border-slate-300 bg-white p-5 text-slate-900">
          <p className="text-sm font-medium uppercase tracking-wide opacity-70">
            {t('axisMarket')}
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">
            {t(gapKey, { amount: axes.marketGap })}
          </p>
          <div className="mt-3 space-y-1 text-base">
            <p className="tabular-nums">{t(topUpKey, { amount: axes.marketGap })}</p>
            <p className="text-xs opacity-70">{t('topUpNote')}</p>
            {axes.marketUnverified && (
              <p className="mt-1 rounded-md bg-amber-100 px-2 py-1 text-sm font-medium text-amber-800">
                {t('marketUnverifiedNote')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
