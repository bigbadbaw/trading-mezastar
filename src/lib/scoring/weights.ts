/**
 * scoring-weights.ts — THE single visible config for the scoring model.
 *
 * Every tunable number lives here as a named constant; the scoring functions
 * contain NO magic numbers (M2-spec §1, §4). These are the INITIAL rebalanced
 * values (M2-spec §3: Scarcity 40 / Popularity 25 / Market 18 / Mechanic 17,
 * ~100 ceiling). They are meant to be tuned against real baskets — change them
 * here, with a before/after justification; never inline a number in score.ts.
 */

import type { GradeTier, MechanicFlag } from './types';

// ---- Component caps (sum = 100 ceiling) -----------------------------------

export const SCARCITY_CAP = 40;
export const POPULARITY_CAP = 25;
export const MARKET_CAP = 18;
export const MECHANIC_CAP = 17;

// TUNED (M-scarcity, 2026-06-09): scarcity headroom for per-tag scarcityRank.
// BEFORE: scarcity was capped at SCARCITY_CAP (40) for every tag, so the two
// super-rare tags (Arceus, Mewtwo) tied at 40/40 — the tier bucket had no finer
// signal. AFTER: a tag that carries a per-tag `scarcityRank` delta (headliners
// only; see scarcity.json) may exceed the 40 tier ceiling by up to its delta,
// clamped here at 50 (super-rare 40 + max delta 10 → 50). Unranked tags are
// untouched and still clamp to SCARCITY_CAP (40). This is the ONLY place the
// 100-point total ceiling gains headroom; every non-headliner tag is byte-identical.
export const SCARCITY_RANK_CAP = 50;

// ---- Scarcity (M2-spec §3a): single lookup replacing rarity + acquisition --

export const SCARCITY_POINTS: Record<GradeTier, number> = {
  'super-rare': 40,
  classic: 36,
  'gold-star': 28,
  // TUNED (post-M4 calibration): 24 → 29.
  // Event-exclusive tags should outrank standard gold-star pulls (24 placed
  // them below gold-star = 28, which felt wrong for limited-event acquisition).
  // New value sits one point above gold-star and well below classic (36).
  special: 29,
  featured: 22,
  'normal-5': 20,
  'normal-4': 14,
  // TUNED (post-M4 calibration): 8 → 12.
  // Closes the "beloved-common paradox": with the old value a 3-tag basket of
  // beloved Grade-3 icons (pop 9) scored as "slight" against 3 obscure Grade-5
  // tags (pop 4). The +4 is enough for the popularity axis to carry the tie —
  // 3× Pikachu (114) vs 3× Lokix (120) → diff 6 pts / 5.3% → "fair".
  // All §7.3 spec-pinned scores (super-rare tier) are unaffected.
  'normal-3': 12,
  'normal-2': 3,
};
/** Used if a tag's gradeTier is somehow absent from the map above. */
export const SCARCITY_FALLBACK = 6;

// ---- Popularity (M2-spec §3b): popScore(1..10) * multiplier ----------------

export const POPULARITY_MULTIPLIER = 2.5;
/** Neutral fallback when a species is missing from the popularity map. */
export const DEFAULT_POPULARITY = 5;

// ---- Market (M2-spec §3c): stepped on median NT$ price, scaled to 18 -------
// Highest matching threshold wins; evaluated top-down.
export const MARKET_STEPS: ReadonlyArray<readonly [threshold: number, points: number]> = [
  [1800, 18],
  [1000, 15],
  [500, 13],
  [250, 10],
  [100, 6],
  [40, 3],
  [0, 1],
];
/** Damping factor applied to market points for unconfirmed-price tags. */
export const UNCONFIRMED_PRICE_CONFIDENCE = 0.6;

// ---- Special mechanic (M2-spec §3d): scores M1's structured flags ----------

// CHANGED (M-scarcity, 2026-06-09): `rareSlot` removed from the mechanic axis.
// BEFORE: rareSlot: 4 lived here, scoring a tag's rare-slot status as a battle
// mechanic. AFTER: rare-slot is a SCARCITY signal (per Anthony, battle attributes
// shouldn't drive collectability), now subsumed by per-tag scarcityRank — the
// rare-slot headliners are exactly the high-resale tags that carry a delta. The
// `mechanics.rareSlot` boolean stays in the tag data (harmless), just no longer scored.
export const MECHANIC_POINTS: Record<MechanicFlag, number> = {
  gigantamax: 4,
  mega: 4,
  zMove: 3,
  legendary: 3,
  classic: 3,
  highAtk: 2,
};

// ---- Grade bands (M2-spec §2e, kept verbatim) ------------------------------
// Highest matching min wins; evaluated top-down. `label` is an i18n key.
export const GRADE_BANDS: ReadonlyArray<readonly [min: number, grade: string]> = [
  [90, 'S'],
  [75, 'A'],
  [60, 'B'],
  [40, 'C'],
  [20, 'D'],
  [0, 'F'],
];

/** Per-grade display metadata. `label` is an i18n message key, not literal text. */
export const GRADE_META: Record<string, { label: string; color: string }> = {
  S: { label: 'scoring.grade.S', color: '#f59e0b' },
  A: { label: 'scoring.grade.A', color: '#ef4444' },
  B: { label: 'scoring.grade.B', color: '#8b5cf6' },
  C: { label: 'scoring.grade.C', color: '#3b82f6' },
  D: { label: 'scoring.grade.D', color: '#10b981' },
  F: { label: 'scoring.grade.F', color: '#6b7280' },
};

// ---- Fairness bands (M2-spec §2f, kept verbatim) ---------------------------

export const FAIRNESS = {
  fairDiff: 5,
  fairSoftDiff: 10,
  fairSoftPct: 8,
  slightDiff: 20,
  slightPct: 20,
} as const;

// ---- i18n message keys for component labels (not literal zh/en text) -------

export const COMPONENT_LABELS = {
  scarcity: 'scoring.component.scarcity',
  popularity: 'scoring.component.popularity',
  market: 'scoring.component.market',
  mechanic: 'scoring.component.mechanic',
} as const;
