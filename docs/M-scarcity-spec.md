# M-scarcity — Per-tag scarcity refinement (scarcityRank) + rareSlot relocation

## Why
The scoring engine reads scarcity from `gradeTier` alone (a 9-value bucket). The two
`super-rare` tags — Arceus (`g1-2-1-009`) and Mewtwo (`g1-2-1-008`) — therefore tie at
40/40 scarcity, even though the community and the resale market rank Arceus as the scarcer,
more-coveted tag. Result before this change: Mewtwo 93 > Arceus 87, driven by Mewtwo's
popularity + gigantamax-mechanic edge. This reads wrong to collectors.

Root cause: scarcity has no per-tag signal finer than the tier bucket. There is **no official
per-tag Mezastar pull rate** (physical tube-dispensed arcade tags; only a ~1-in-14 tier rate
exists, and "pull rates" collectors cite are reverse-engineered rare-slot estimates). The
reliable per-tag scarcity signal is **resale-price ordering**, which encodes the community's
rare-slot knowledge.

## Decision (path A′, chosen 2026-06-09)
- Add a thin per-tag **`scarcityRank`** (a points DELTA added to the tier base) for the
  56 grade-6 headliner tags only (super-rare + classic + grade-6 gold-star). Non-headliner
  tags have no entry and score on tier alone (delta 0) — long-tail ties are acceptable and
  correct (equally-common tags should tie).
- **Price stays OUT of the scarcity axis as a runtime input** — `scarcityRank` is precomputed
  in `scarcity.json` (using price band as the *authoring* proxy), NOT read from `tag.price` in
  the engine. This keeps the scarcity axis and the market axis independent at runtime, so the
  two-axis verdict (AGREE / REINFORCE / DIVERGE) is preserved. **The shipped market axis is
  untouched.** No double-count: the engine never reads price for scarcity.
- **Move `rareSlot` OUT of the mechanic axis.** rareSlot is a scarcity signal, not a battle
  mechanic; per Anthony, battle attributes shouldn't drive collectability. It is now subsumed
  by scarcityRank (the rare-slot tags are the high-resale headliners that already get a delta).
  Drop `rareSlot` from `MECHANIC_POINTS`.

## Data artifact
`src/data/scarcity.json` — `ranks: { [tagId]: { scarcityRank, source, tcBasis, note } }`.
- `scarcityRank`: integer points delta, 0–10. Distribution: {0:9, 2:5, 4:10, 6:15, 8:13, 10:4}.
- `source`: `'resale-consensus'` (2 apex super-rares, ranked vs external JP resale data) or
  `'catalog-price-proxy'` (price-band-ordered).
- `tcBasis`: `'confirmed'` (3 physically-verified reprints) or `'jp-inferred'` (rest; flip to
  confirmed when Anthony reads the physical TC tag).
- `note`: human rationale where relevant.

## Engine changes
1. **weights.ts**
   - Remove `rareSlot` from `MECHANIC_POINTS` (delete the line). `MECHANIC_FLAGS` in types.ts
     drops `'rareSlot'` too (and the `MechanicFlag` union). Tags' `mechanics.rareSlot`
     field stays in the data (harmless), just no longer scored.
   - Add `SCARCITY_RANK_CAP = 50` — the scarcity cap for tags that carry a scarcityRank
     (base tier + delta, clamped to 50). Unranked tags still clamp to `SCARCITY_CAP = 40`.
     Rationale: a ranked headliner can exceed the 40 tier ceiling by up to its delta; +10 on
     super-rare (40) → 50. This is the ONLY place the 100-point total ceiling headroom changes.
2. **score.ts → `scoreTag`**
   - Accept the scarcity-rank lookup as an INJECTED param (like popularity — engine imports
     nothing from data): `scoreTag(tag, popLookup, scarcityLookup)` where
     `scarcityLookup(tagId) => number` returns the delta (0 if absent).
   - scarcity = `clamp(SCARCITY_POINTS[tier] + scarcityLookup(tag.tagId), ranked ? 50 : 40)`.
     (A tag is "ranked" iff the lookup returns > 0.)
   - The breakdown's `scarcity` component exposes the delta + base so the transparent
     "why" still adds up (`{ points, base, rankDelta, tier, label }`).
   - mechanic: unchanged except rareSlot is gone from the flag set.
3. **Wiring** — wherever the catalog builds the popularity lookup, build a parallel scarcity
   lookup from `scarcity.json` and pass it through `scoreBasket` → `scoreTag`.

## Tests (score.test.ts)
- **Regression (the headline):** Arceus (`g1-2-1-009`) total > Mewtwo (`g1-2-1-008`) total.
  With delta Arceus +10 / Mewtwo +2 and rareSlot removed: **Arceus 93 vs Mewtwo 91.**
- Unranked tag scores identically before/after (scarcityLookup → 0, cap 40).
- A ranked gold-star (Rayquaza `s4-1-4-010`, delta +10) gets base 28 + 10 = 38 scarcity.
- rareSlot no longer contributes: a tag with `mechanics.rareSlot=true` and no other flags
  scores 0 mechanic.
- Breakdown transparency: scarcity component's base + rankDelta == points.

## Verification after build
- `pnpm test` green (existing + new). `tsc` strict + `noUncheckedIndexedAccess` clean.
- Comparator on Arceus vs Mewtwo — collector verdict now favors Arceus.
- Two-axis market readout unchanged (Arceus already out-prices Mewtwo, so market still agrees).

## Open / follow-up (NOT this build)
- Flip `tcBasis` to `confirmed` as Anthony physically reads headliner TC tags.
- Long-tail ties remain by design; revisit only if a specific tie reads wrong.
