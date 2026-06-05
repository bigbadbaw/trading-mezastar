/**
 * Two-axis verdict derivation (presentation layer — NOT the scoring engine).
 *
 * The 2026-06-05 "SCORING A/B/C FORK — DECIDED" checkpoint requires the trade
 * verdict to surface collector value and market value as TWO co-equal axes,
 * never collapsed into one number and without reweighting `scoring-weights.ts`.
 *
 * This module is a PURE consumer of the engine's already-computed
 * `FairnessVerdict` (mirroring `basket.ts`): it reads `verdict`/`richerSide`
 * (the score axis) and `priceGap`/`payingSide` (the market axis) and reduces
 * them to a single three-state agreement signal for the UI. It invents NO
 * pricing logic — the cash gap is reused verbatim from `judgeFairness`. The one
 * new number, `MARKET_EVEN`, is a DISPLAY threshold for "is the cash gap
 * material enough to call the axes divergent"; it changes no price/score math
 * and is deliberately NOT in `scoring-weights.ts` (which stays the single source
 * of truth for the SCORE).
 *
 * `left` = my side, `right` = their side — matching `judgeFairness` and the
 * 🟢/🔴 UI. Directions/sides are emitted as `'mine'`/`'theirs'` so the component
 * maps straight to its i18n keys with no further translation of left/right.
 */

import type { ComparisonResult } from './basket';
import { isUnconfirmed } from '@/lib/tag-display';

/**
 * Presentation-only tolerance: the market axis reads as "even" when the cash gap
 * is within a small floor OR a small fraction of the richer basket. Display
 * classification only — see the module comment.
 */
export const MARKET_EVEN = {
  /** NT$ gaps at or below this are noise regardless of basket size. */
  absFloor: 100,
  /** Or: gap ≤ this percent of the larger basket's median-price sum. */
  pct: 10,
} as const;

export type AxisDirection = 'even' | 'mine' | 'theirs';
export type AgreementState = 'agree' | 'diverge' | 'reinforce';

export interface VerdictAxes {
  /** How the two axes relate — drives the synthesis line and its styling. */
  agreement: AgreementState;
  /** Collector-value direction; a `fair` score band counts as `even`. */
  scoreDirection: AxisDirection;
  /** Market-value direction; within `MARKET_EVEN` counts as `even`. */
  marketDirection: AxisDirection;
  /** Which side is worth more cash (opposite of the engine's `payingSide`). */
  marketRicherSide: 'mine' | 'theirs' | 'none';
  /** Rounded NT$ gap between the two baskets' median-price sums. */
  marketGap: number;
  /**
   * True when any contributing line on either side has an unverified price: the
   * gap is only as firm as its softest input, so one soft side flags the figure.
   */
  marketUnverified: boolean;
}

const SIDE = { left: 'mine', right: 'theirs' } as const;

/** Reduce the engine's verdict + both baskets to the two-axis display state. */
export function deriveVerdictAxes(result: ComparisonResult): VerdictAxes {
  const { verdict, left, right } = result;

  // Score axis: only `slight`/`unfair` are directional; `fair` reads as even.
  const scoreDirection: AxisDirection =
    verdict.verdict === 'fair' || verdict.richerSide === 'none'
      ? 'even'
      : SIDE[verdict.richerSide];

  // Market axis: reuse the engine's priceGap/payingSide verbatim.
  const marketGap = Math.round(verdict.priceGap);
  const marketRicherSide: VerdictAxes['marketRicherSide'] =
    verdict.payingSide === 'none' ? 'none' : verdict.payingSide === 'left' ? 'theirs' : 'mine';

  const maxSum = Math.max(left.basket.medianPriceSum, right.basket.medianPriceSum);
  const marketEven =
    marketRicherSide === 'none' ||
    verdict.priceGap <= MARKET_EVEN.absFloor ||
    (maxSum > 0 && (verdict.priceGap / maxSum) * 100 <= MARKET_EVEN.pct);
  const marketDirection: AxisDirection = marketEven ? 'even' : marketRicherSide;

  const agreement: AgreementState =
    scoreDirection === 'even' && marketDirection === 'even'
      ? 'agree'
      : scoreDirection !== 'even' && scoreDirection === marketDirection
        ? 'reinforce'
        : 'diverge';

  const marketUnverified =
    left.lines.some((l) => isUnconfirmed(l.entry.tag)) ||
    right.lines.some((l) => isUnconfirmed(l.entry.tag));

  return {
    agreement,
    scoreDirection,
    marketDirection,
    marketRicherSide,
    marketGap,
    marketUnverified,
  };
}
