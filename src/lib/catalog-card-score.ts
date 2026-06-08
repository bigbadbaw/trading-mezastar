/**
 * Card-level two-axis score (presentation layer — NOT the scoring engine).
 *
 * The catalog card surfaces the same two axes the trade verdict does — collector
 * value and market value — but for a SINGLE tag. This is a PURE consumer of the
 * engine's already-computed `ScoreBreakdown` (mirroring `verdict-axes.ts`): it
 * reads `total` and the `market` component verbatim and reduces them to a compact
 * parity signal. It invents NO scoring and recomputes nothing.
 *
 * `marketParity` answers "is this tag's cash value in line with its collector
 * merit?" by comparing the two axes' normalized standings. Both the display
 * ceiling and the tolerance are DISPLAY constants (like `verdict-axes.ts`'s
 * `MARKET_EVEN`): they change no score/price math and are deliberately NOT in
 * `scoring-weights.ts`, which stays the single source of truth for the SCORE.
 */

import type { ScoreBreakdown } from '@/data/catalog';

/** Even = cash tracks collector merit; rich/poor = the market diverges up/down. */
export type CardMarketParity = 'even' | 'market-rich' | 'market-poor';

export interface CardScore {
  /** Collector value — `score.total` verbatim (0..100). */
  collector: number;
  /** How the market (cash) axis relates to the collector axis. */
  marketParity: CardMarketParity;
  /** Rounded NT$ median price (the market axis' short value). */
  marketPrice: number;
  /** True when the price is unverified (confidence below 1.0). */
  marketUnverified: boolean;
}

/**
 * Market points ceiling, mirrored here for DISPLAY normalization only so the two
 * axes are compared on the same 0..1 scale. Mirrors the engine's `MARKET_CAP`;
 * if they ever drift the parity glyph is merely slightly off (standings are
 * clamped), never wrong-by-construction. Display threshold, not a score input.
 */
const MARKET_DISPLAY_CEILING = 18;

/** Standing gap (0..1) within which the two axes read as "in parity". Display only. */
const PARITY_TOLERANCE = 0.2;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Reduce the engine's per-tag breakdown to the compact card two-axis display. */
export function deriveCardScore(score: ScoreBreakdown): CardScore {
  const { market } = score.components;
  const collectorStanding = clamp01(score.total / 100);
  const marketStanding = clamp01(market.points / MARKET_DISPLAY_CEILING);
  const delta = marketStanding - collectorStanding;

  const marketParity: CardMarketParity =
    Math.abs(delta) <= PARITY_TOLERANCE
      ? 'even'
      : delta > 0
        ? 'market-rich'
        : 'market-poor';

  return {
    collector: score.total,
    marketParity,
    marketPrice: Math.round(market.medianPrice),
    marketUnverified: market.confidence < 1,
  };
}
