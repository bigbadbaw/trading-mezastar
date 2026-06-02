# ADR-0002: Rebalanced hybrid scoring (market price demoted, popularity added)

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Anthony

## Context

The tool must assign each tag a point value so two trade batches can be compared for fairness.
The audience includes kids, so the score must be transparent and explainable, not a black box.
A community prototype already used a 4-dimension score (rarity, market price ~30%, acquisition
difficulty, special bonus) but had no explicit franchise-popularity dimension — so it could not
express that a beloved-but-common species can out-value a rarer-but-obscure one
(e.g. Mewtwo vs. Arceus).

There was initial reluctance to use market value at all (seen as "arbitrary"). On reflection,
market price is the *least* arbitrary single signal in general — but for **Taiwan Mezastar
specifically** the resale market is thin and noisy, and for a **kids' playground** context,
perceived fairness tracks coolness/popularity more than resale.

## Decision

Use a **rebalanced hybrid** in a single visible `scoring-weights.ts` config:

- Rarity / scarcity — largest weight
- Popularity — large; franchise-wide, species-level (new dimension)
- Market price — small (~15–20%), sanity anchor only
- Special-mechanic bonus — small

All weights live in config and are surfaced in the UI breakdown. Fairness uses tunable
tolerance bands.

## Alternatives considered

- **Pure market price** — rejected. Thin/noisy Taiwan data; doesn't match the kid-fairness goal;
  volatile.
- **Pure attribute scoring (no market)** — rejected. Feels principled but is actually more
  subjective (every weight is a judgment); can declare trades "fair" that any collector would
  reject because it ignores real-world signal entirely.

## Consequences

- Positive: explainable; stable; captures franchise popularity; keeps a reality anchor.
- Negative / risks: popularity is curation work (~200 species) and inherently a judgment model;
  must record sources to stay defensible.
- Follow-ups: build the Species Popularity Table; tune weights with real trade examples.
