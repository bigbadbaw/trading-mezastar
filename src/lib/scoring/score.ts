/**
 * Pure scoring engine (M2-spec §3, §5).
 *
 * Imports NOTHING from data, Supabase, Next, or app state. Input is plain data
 * (a ScorableTag + an injected popularity lookup); output is a plain breakdown
 * object. Each component is rounded to an integer and the total is their sum, so
 * the displayed rows always add up to the headline number (transparency by
 * construction — a parent can read exactly why a trade is flagged).
 */

import {
  COMPONENT_LABELS,
  DEFAULT_POPULARITY,
  MARKET_CAP,
  MARKET_STEPS,
  MECHANIC_CAP,
  MECHANIC_POINTS,
  POPULARITY_CAP,
  POPULARITY_MULTIPLIER,
  SCARCITY_CAP,
  SCARCITY_FALLBACK,
  SCARCITY_POINTS,
} from './weights';
import { gradeOf } from './grade';
import { MECHANIC_FLAGS } from './types';
import type {
  BasketScore,
  MechanicFlag,
  PopularityLookup,
  PopularitySource,
  ScorableTag,
  ScoreBreakdown,
} from './types';

const clamp = (n: number, cap: number) => Math.max(0, Math.min(cap, n));

function medianPrice(price: readonly number[]): number {
  const lo = price[0] ?? 0;
  const hi = price[1] ?? lo;
  return (lo + hi) / 2;
}

function marketStepPoints(median: number): number {
  for (const [threshold, points] of MARKET_STEPS) {
    if (median >= threshold) return points;
  }
  return 0; // MARKET_STEPS ends at [0, …]; unreachable for non-negative input.
}

function resolvePopularity(
  species: readonly string[],
  popLookup: PopularityLookup,
): { popScore: number; source: PopularitySource } {
  let popScore = DEFAULT_POPULARITY;
  let source: PopularitySource = 'default';
  let found = false;
  for (const sp of species) {
    const hit = popLookup(sp);
    // For the dual-tag, take the most popular of its species.
    if (hit && (!found || hit.score > popScore)) {
      popScore = hit.score;
      source = hit.source;
      found = true;
    }
  }
  return { popScore, source };
}

function activeMechanics(mech: ScorableTag['mechanics']): MechanicFlag[] {
  return MECHANIC_FLAGS.filter((f) => mech[f]);
}

/** Score a single tag into a transparent breakdown (M2-spec §5). */
export function scoreTag(tag: ScorableTag, popLookup: PopularityLookup): ScoreBreakdown {
  // Scarcity
  const scarcityPoints = clamp(
    SCARCITY_POINTS[tag.gradeTier] ?? SCARCITY_FALLBACK,
    SCARCITY_CAP,
  );

  // Popularity (injected lookup; neutral default when missing)
  const { popScore, source } = resolvePopularity(tag.species, popLookup);
  const popularityPoints = clamp(Math.round(popScore * POPULARITY_MULTIPLIER), POPULARITY_CAP);

  // Market (demoted anchor; damped by price confidence)
  const median = medianPrice(tag.price);
  const marketPoints = clamp(
    Math.round(marketStepPoints(median) * tag.priceConfidence),
    MARKET_CAP,
  );

  // Special mechanic (scores M1's structured flags, never raw note text)
  const flags = activeMechanics(tag.mechanics);
  const mechanicPoints = clamp(
    flags.reduce((sum, f) => sum + MECHANIC_POINTS[f], 0),
    MECHANIC_CAP,
  );

  const total = clamp(scarcityPoints + popularityPoints + marketPoints + mechanicPoints, 100);

  return {
    total,
    grade: gradeOf(total),
    components: {
      scarcity: { points: scarcityPoints, tier: tag.gradeTier, label: COMPONENT_LABELS.scarcity },
      popularity: {
        points: popularityPoints,
        popScore,
        source,
        label: COMPONENT_LABELS.popularity,
      },
      market: {
        points: marketPoints,
        medianPrice: median,
        confidence: tag.priceConfidence,
        label: COMPONENT_LABELS.market,
      },
      mechanic: { points: mechanicPoints, flags, label: COMPONENT_LABELS.mechanic },
    },
  };
}

/** Score one side of a trade: total score + the market-price anchor sum. */
export function scoreBasket(tags: readonly ScorableTag[], popLookup: PopularityLookup): BasketScore {
  const scored = tags.map((t) => scoreTag(t, popLookup));
  return {
    total: scored.reduce((sum, s) => sum + s.total, 0),
    medianPriceSum: scored.reduce((sum, s) => sum + s.components.market.medianPrice, 0),
    tags: scored,
  };
}
