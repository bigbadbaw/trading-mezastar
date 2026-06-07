'use client';

import { useTranslations } from 'next-intl';

import type { ComparisonResult } from '@/lib/compare/basket';
import { deriveVerdictAxes, type VerdictAxes } from '@/lib/compare/verdict-axes';

const VERDICT_META: Record<
  ComparisonResult['verdict']['verdict'],
  { labelKey: 'verdictFair' | 'verdictSlight' | 'verdictUnfair'; box: string }
> = {
  fair: {
    labelKey: 'verdictFair',
    box: 'border-status-fair/60 bg-status-fair/10 text-vault-text',
  },
  slight: {
    labelKey: 'verdictSlight',
    box: 'border-status-slight/60 bg-status-slight/10 text-vault-text',
  },
  unfair: {
    labelKey: 'verdictUnfair',
    box: 'border-status-unfair/60 bg-status-unfair/10 text-vault-text',
  },
};

/** Synthesis-banner styling per agreement state — DIVERGE is informative, never an error. */
const STATE_BOX: Record<VerdictAxes['agreement'], string> = {
  agree: 'border-status-fair/60 bg-status-fair/10 text-vault-text',
  diverge: 'border-status-diverge/60 bg-status-diverge/10 text-vault-text',
  reinforce: 'border-status-slight/60 bg-status-slight/10 text-vault-text',
};

/** Centered verdict arrow color + glyph per axis state. */
function verdictArrow(axes: VerdictAxes): { glyph: string; colorClass: string; ariaKey: string } {
  if (axes.agreement === 'diverge') {
    return { glyph: '⟷', colorClass: 'text-status-diverge', ariaKey: 'arrowDiverge' };
  }
  if (axes.scoreDirection === 'even') {
    return { glyph: '↔', colorClass: 'text-status-fair', ariaKey: 'arrowEven' };
  }
  const towardMine = axes.scoreDirection === 'mine';
  return {
    glyph: towardMine ? '←' : '→',
    colorClass: 'text-status-slight',
    ariaKey: towardMine ? 'arrowAdvantageMine' : 'arrowAdvantageTheirs',
  };
}

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
  const { verdict, left, right } = result;
  const axes = deriveVerdictAxes(result);
  const meta = VERDICT_META[verdict.verdict];
  const arrow = verdictArrow(axes);

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

  const mineHigher = left.basket.total > right.basket.total;
  const theirsHigher = right.basket.total > left.basket.total;

  return (
    <section aria-label={t('verdictHeading')} className="flex flex-col gap-4">
      <p
        className={`rounded-xl border-2 p-4 text-lg font-bold ${STATE_BOX[axes.agreement]}`}
        role="status"
      >
        {t(synthesisKey(axes), { amount: axes.marketGap })}
      </p>

      <p
        className={`flex justify-center text-4xl motion-safe:animate-verdictPulse ${arrow.colorClass}`}
        aria-label={t(arrow.ariaKey)}
        role="img"
      >
        {arrow.glyph}
      </p>

      <div className="flex items-center justify-center gap-6 text-sm">
        <span
          className={`rounded-lg px-3 py-1 font-mono tabular-nums text-vault-text ${mineHigher ? 'shadow-score-higher' : ''}`}
        >
          {t('mySide')}: {left.basket.total} {t('sideScoreUnit')}
        </span>
        <span
          className={`rounded-lg px-3 py-1 font-mono tabular-nums text-vault-text ${theirsHigher ? 'shadow-score-higher' : ''}`}
        >
          {t('theirSide')}: {right.basket.total} {t('sideScoreUnit')}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Collector value — the headline a kid reads. */}
        <div className={`rounded-xl border-2 p-5 ${meta.box}`}>
          <p className="text-sm font-medium uppercase tracking-wide text-vault-muted">
            {t('axisCollector')}
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold">{t(meta.labelKey)}</p>
          <div className="mt-3 space-y-1 text-base">
            <p className="font-mono tabular-nums">
              {t('whyDiff', { diff: verdict.diff, pct: Math.round(verdict.pctDiff) })}
            </p>
            <p className="font-medium">{t(richerKey)}</p>
          </div>
        </div>

        {/* Market value — a clearly-labeled cash figure an adult reads. */}
        <div
          className="rounded-xl border-2 border-vault-hairline p-5 text-vault-text"
          style={{ backgroundColor: 'var(--panel-fill)' }}
        >
          <p className="text-sm font-medium uppercase tracking-wide text-vault-muted">
            {t('axisMarket')}
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums">
            {t(gapKey, { amount: axes.marketGap })}
          </p>
          <div className="mt-3 space-y-1 text-base">
            <p className="font-mono tabular-nums">{t(topUpKey, { amount: axes.marketGap })}</p>
            <p className="text-xs text-vault-muted">{t('topUpNote')}</p>
            {axes.marketUnverified && (
              <p className="mt-1 rounded-md bg-status-slight/20 px-2 py-1 text-sm font-medium text-status-slight">
                {t('marketUnverifiedNote')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
