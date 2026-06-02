/**
 * Fairness verdict for two baskets (M2-spec §2f, bands kept verbatim).
 *
 * The verdict is computed from the two baskets' SCORE totals. The cash-top-up
 * suggestion ("倒貼 / pays NT$X") is computed SEPARATELY from the market-price
 * difference (sum of medians), preserving Rachel's real-money anchor even though
 * market is demoted within the score itself.
 */

import { FAIRNESS } from './weights';
import type { BasketScore, FairnessVerdict } from './types';

export function judgeFairness(left: BasketScore, right: BasketScore): FairnessVerdict {
  const diff = Math.abs(left.total - right.total);
  const max = Math.max(left.total, right.total);
  const pctDiff = max === 0 ? 0 : (diff / max) * 100;

  let verdict: FairnessVerdict['verdict'];
  if (diff <= FAIRNESS.fairDiff || (diff <= FAIRNESS.fairSoftDiff && pctDiff <= FAIRNESS.fairSoftPct)) {
    verdict = 'fair';
  } else if (diff <= FAIRNESS.slightDiff || pctDiff <= FAIRNESS.slightPct) {
    verdict = 'slight';
  } else {
    verdict = 'unfair';
  }

  const richerSide =
    left.total === right.total ? 'none' : left.total > right.total ? 'left' : 'right';

  // Cash anchor: the side with the cheaper basket (by market median) tops up the gap.
  const priceGap = Math.abs(left.medianPriceSum - right.medianPriceSum);
  const payingSide =
    left.medianPriceSum === right.medianPriceSum
      ? 'none'
      : left.medianPriceSum < right.medianPriceSum
        ? 'left'
        : 'right';

  return { verdict, diff, pctDiff, richerSide, priceGap, payingSide };
}
