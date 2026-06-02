/**
 * Scoring-engine domain contract.
 *
 * This module is the SINGLE SOURCE OF TRUTH for the domain enums the scoring
 * engine is keyed on (`gradeTier`, the `mechanics` flags). The catalog/data
 * layer imports these literal arrays to build its Zod schemas, so the dependency
 * flows data -> scoring (the catalog depends on the engine's contract), never the
 * reverse. The engine itself imports NOTHING from data, Supabase, Next, or app
 * state (M2-spec §1).
 */

/** Grade-tier (scarcity) enum — the 9 values present in the v1 seed. */
export const GRADE_TIERS = [
  'super-rare',
  'classic',
  'gold-star',
  'featured',
  'normal-5',
  'normal-4',
  'normal-3',
  'normal-2',
  'special',
] as const;
export type GradeTier = (typeof GRADE_TIERS)[number];

/** Structured special-mechanic flags, derived ONCE by the M1 migration. */
export const MECHANIC_FLAGS = [
  'gigantamax',
  'mega',
  'rareSlot',
  'zMove',
  'legendary',
  'classic',
  'highAtk',
] as const;
export type MechanicFlag = (typeof MECHANIC_FLAGS)[number];

export type Mechanics = Record<MechanicFlag, boolean>;

/** Provenance of a species' popularity score (mirrors popularity.json `source`). */
export type PopularitySource = 'poll' | 'agg' | 'search' | 'default';

/**
 * The minimal shape `scoreTag` needs. The migrated catalog `Tag` is a structural
 * superset of this, so it can be passed directly.
 */
export interface ScorableTag {
  gradeTier: GradeTier;
  mechanics: Mechanics;
  /** NT$ [low, high] range; median drives the (demoted) market anchor. */
  price: readonly number[];
  /** 1.0 normally, 0.6 for unconfirmed price (M2-spec §3c). */
  priceConfidence: number;
  /** Base species for the popularity join; length 2 for the dual-tag. */
  species: readonly string[];
}

/**
 * Injected popularity lookup. The engine never imports popularity.json; the
 * catalog layer builds this from it and passes it in (M2-spec §1).
 */
export type PopularityLookup = (
  species: string,
) => { score: number; source: PopularitySource } | undefined;

/** A single scored component row, ready for the transparent UI breakdown. */
export interface ScoreBreakdown {
  /** Rounded sum, 0..100. */
  total: number;
  grade: { grade: string; label: string; color: string };
  components: {
    scarcity: { points: number; tier: GradeTier; label: string };
    popularity: {
      points: number;
      popScore: number;
      source: PopularitySource;
      label: string;
    };
    market: {
      points: number;
      medianPrice: number;
      confidence: number;
      label: string;
    };
    mechanic: { points: number; flags: MechanicFlag[]; label: string };
  };
}

/** Aggregate score for one side of a trade. */
export interface BasketScore {
  /** Sum of tag totals. */
  total: number;
  /** Sum of per-tag median prices (NT$) — the real-money anchor for §2f. */
  medianPriceSum: number;
  tags: ScoreBreakdown[];
}

export type Verdict = 'fair' | 'slight' | 'unfair';

export interface FairnessVerdict {
  verdict: Verdict;
  /** |left.total - right.total|. */
  diff: number;
  /** diff / max(left,right) * 100. */
  pctDiff: number;
  /** Which side's score is higher. */
  richerSide: 'left' | 'right' | 'none';
  /** Absolute NT$ gap between the two baskets' median-price sums. */
  priceGap: number;
  /** Which side should top up in cash to anchor the trade (the poorer side). */
  payingSide: 'left' | 'right' | 'none';
}
