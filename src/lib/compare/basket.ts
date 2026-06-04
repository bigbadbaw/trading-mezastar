/**
 * Trade-comparator math (M4b) — a thin, PURE consumer of the scoring engine.
 *
 * M4b does not own any scoring: it aggregates the catalog's already-computed
 * per-tag breakdowns into the engine's `BasketScore` contract, honoring a
 * per-line quantity, and defers the fairness call to the engine's
 * `judgeFairness`. It deliberately does NOT re-run `scoreTag`/`scoreBasket`,
 * because that would require the popularity lookup the catalog layer owns
 * (M2-spec §1) — reusing `ScoredTag.score` keeps that join in one place and
 * leaves `catalog.ts` untouched. The result is byte-for-byte the same
 * `BasketScore` `scoreBasket` would produce for the quantity-expanded basket:
 * `total` = Σ per-tag totals, `medianPriceSum` = Σ per-tag medians.
 *
 * No React, no Supabase, no Next here — just data in, verdict out (testable).
 */

import { judgeFairness } from '@/lib/scoring/fairness';
import type { BasketScore, FairnessVerdict } from '@/lib/scoring/types';
import type { ScoredTag } from '@/data/catalog';

/** One basket line: a catalog tag plus how many of it are being traded. */
export interface BasketLine {
  entry: ScoredTag;
  /** Copies traded; only positive quantities contribute. */
  quantity: number;
}

/** A line with its quantity-scaled contributions, ready for the UI. */
export interface ScoredLine {
  entry: ScoredTag;
  quantity: number;
  /** `score.total × quantity`. */
  lineTotal: number;
  /** Median market price × quantity (NT$). */
  lineMedian: number;
}

/** One side of a trade: the engine-shaped basket plus per-line detail. */
export interface SideScore {
  basket: BasketScore;
  lines: ScoredLine[];
}

/** Full comparison: both sides plus the engine's fairness verdict. */
export interface ComparisonResult {
  left: SideScore;
  right: SideScore;
  verdict: FairnessVerdict;
}

/**
 * Aggregate one side into a `BasketScore`, honoring quantity. Equivalent to
 * `scoreBasket` over the quantity-expanded tag list, but reusing the per-tag
 * scores the catalog already produced (no popularity re-join).
 */
export function scoreSide(lines: readonly BasketLine[]): SideScore {
  const scored: ScoredLine[] = lines
    .filter((l) => l.quantity > 0)
    .map((l) => ({
      entry: l.entry,
      quantity: l.quantity,
      lineTotal: l.entry.score.total * l.quantity,
      lineMedian: l.entry.score.components.market.medianPrice * l.quantity,
    }));

  const total = scored.reduce((sum, l) => sum + l.lineTotal, 0);
  const medianPriceSum = scored.reduce((sum, l) => sum + l.lineMedian, 0);
  // Expand by quantity so the basket's `tags` array matches scoreBasket exactly.
  const tags = scored.flatMap((l) =>
    Array.from({ length: l.quantity }, () => l.entry.score),
  );

  return { basket: { total, medianPriceSum, tags }, lines: scored };
}

/**
 * Score both sides and judge fairness. `left` is "my side", `right` is "their
 * side" — matching `judgeFairness`'s left/right and the UI's 🟢/🔴.
 */
export function compareBaskets(
  leftLines: readonly BasketLine[],
  rightLines: readonly BasketLine[],
): ComparisonResult {
  const left = scoreSide(leftLines);
  const right = scoreSide(rightLines);
  return { left, right, verdict: judgeFairness(left.basket, right.basket) };
}
