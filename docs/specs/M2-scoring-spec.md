# M2 — Scoring Engine Spec

**Audience:** CC (implements `lib/scoring/`), then Cursor (tunes weights against real data).
**Goal:** Port Rachel's working `calcTradeValue` faithfully, then apply the agreed rebalance and add the new Popularity axis — keeping her transparent breakdown and her grade/fairness bands intact.

This spec is grounded in the actual prototype code (the file uploaded as `LICENSE`), not the Notion summary. Where the two disagreed, the code wins and is reflected here.

---

## 1. Architecture (non-negotiable)

- `lib/scoring/` is **pure**: it imports nothing from Supabase, Next, or app state. Input is plain data; output is a plain object.
- All tunable numbers live in `scoring-weights.ts`. No magic numbers inside the scoring functions.
- `scoreTag()` returns a **breakdown object**, never just a number, so the UI renders "why" directly (preserving Rachel's transparent display).
- Popularity is **injected as a parameter** (a `species -> score` lookup). The engine never imports `popularity.json` itself. This keeps the engine pure and testable, and lets the catalog layer own the join.

```
lib/scoring/
  weights.ts        # all constants (this is scoring-weights.ts)
  score.ts          # scoreTag(), scoreBasket()
  grade.ts          # gradeOf()
  fairness.ts       # judgeFairness()
  types.ts          # ScoredTag, ScoreBreakdown, FairnessVerdict
  score.test.ts     # includes the regression cases in §7
```

---

## 2. Rachel's ACTUAL model (verified baseline — port this first)

Additive, ceiling ~100. Reproduce exactly before rebalancing so we have a known-good baseline to diff against.

### 2a. Rarity (max 45) — lookup on `rarity` tier
```
super-rare 45 | classic 40 | gold-star 32 | featured 27 | normal-5 25
special 22 | normal-4 20 | normal-3 11 | normal-2 5 | (fallback 8)
```

### 2b. Market (max 30) — stepped on median Shopee price = (price[0]+price[1])/2
```
>=1800 -> 30 | >=1000 -> 26 | >=500 -> 22 | >=250 -> 16 | >=100 -> 10 | >=40 -> 5 | else 2
```

### 2c. Acquisition difficulty (max 10) — second lookup on `rarity`
```
super-rare 10 | classic 9 | gold-star 8 | special 7 | featured 5
normal-5 4 | normal-4 2 | normal-3 1 | normal-2 0 | (fallback 0)
```
> NOTE: 2a and 2c are BOTH driven by `rarity`. They double-count the same signal.
> The rebalance merges them (see §3).

### 2d. Special bonus (max 15) — pattern matches on `note` + `enName`
```
G-Max / 極巨化 / 超極巨化 / Gigantamax        +4
Mega / 超級進化 / enName startsWith "Mega "   +4
rare-slot / 稀有位 / 越級限量                   +4
Z-move / Z招式                                  +3
legendary / 傳說 / 神獸 / 幻之 / 究極異獸 / Paradox +3
rarity === 'classic'                            +3
atk >= 170                                      +2
(sum capped at 15)
```
> These pattern matches must NOT run at scoring time in the new build.
> M1's migration derives a structured `mechanics` object ONCE; §3 scores that.

### 2e. Grade bands (keep as-is)
```
S >=90 | A >=75 | B >=60 | C >=40 | D >=20 | F <20
```

### 2f. Fairness verdict (keep as-is — note: NOT the simple "<30%/2x" from Notion)
Given basket totals `left`, `right`: `diff = |left-right|`, `pctDiff = diff/max(left,right)*100`.
```
Fair      : diff <= 5  OR (diff <= 10 AND pctDiff <= 8)
Slight    : diff <= 20 OR pctDiff <= 20
Unfair    : otherwise
```
The "倒貼 / pays NT$X" suggestion is computed from the **market-price** difference of the two baskets (sum of medians), SEPARATELY from the score. Preserve this — it's a nice touch and keeps a real-money anchor even though market is demoted in the score.

---

## 3. The rebalance (apply after baseline passes)

Same ~100 ceiling, so §2e grades and §2f bands keep working unchanged. Four dimensions:

| Dimension | Rachel | New cap | Change |
|---|---|---|---|
| Scarcity (rarity + acq, MERGED) | 55 | **40** | de-duplicated; still the dominant axis |
| Popularity (NEW, species-level) | 0 | **25** | injected param; `popScore(1-10) * 2.5` |
| Market | 30 | **18** | demoted to sanity anchor; reuse §2b shape, rescaled |
| Special mechanic | 15 | **17** | ~unchanged; scores M1's `mechanics` flags |

### 3a. Scarcity (max 40)
Single lookup (replaces both 2a and 2c). Suggested mapping preserving rank order:
```
super-rare 40 | classic 36 | gold-star 28 | special 24 | featured 22
normal-5 20 | normal-4 14 | normal-3 8 | normal-2 3 | (fallback 6)
```

### 3b. Popularity (max 25)
```
popularityPoints = round( popScore * 2.5 )   // popScore is 1..10 from popularity.json
```
If a tag's species is missing from the popularity map, fall back to a neutral default
(`DEFAULT_POPULARITY = 5` → 12-13 pts) and flag it in the breakdown as `source: "default"`.

### 3c. Market (max 18) — same steps as §2b, scaled to 18
```
>=1800 -> 18 | >=1000 -> 15 | >=500 -> 13 | >=250 -> 10 | >=100 -> 6 | >=40 -> 3 | else 1
```
Multiply by a `priceConfidence` factor (1.0 confirmed, 0.6 unconfirmed-price) so noisy
Shopee guesses on unconfirmed packs can't dominate. (Carry the price-provenance flag from M1.)

### 3d. Special mechanic (max 17)
Score M1's structured `mechanics` object, not raw note text:
```
gigantamax +4 | mega +4 | rareSlot +4 | zMove +3 | legendary +3 | classic +3 | highAtk(atk>=170) +2
(cap 17)
```

All of the above numbers are the INITIAL values for `scoring-weights.ts`. They are meant to be
tuned by Cursor against real baskets — the point is they're all named constants in one file.

---

## 4. `scoring-weights.ts` shape

```ts
export const SCARCITY_POINTS: Record<GradeTier, number> = { /* §3a */ };
export const MARKET_STEPS: ReadonlyArray<[threshold: number, points: number]> = [
  [1800,18],[1000,15],[500,13],[250,10],[100,6],[40,3],[0,1],
];
export const POPULARITY_MULTIPLIER = 2.5;   // popScore(1-10) * this
export const DEFAULT_POPULARITY = 5;
export const MECHANIC_POINTS = { gigantamax:4, mega:4, rareSlot:4, zMove:3, legendary:3, classic:3, highAtk:2 };
export const MECHANIC_CAP = 17;
export const UNCONFIRMED_PRICE_CONFIDENCE = 0.6;
export const GRADE_BANDS: ReadonlyArray<[min:number, grade:string]> = [
  [90,'S'],[75,'A'],[60,'B'],[40,'C'],[20,'D'],[0,'F'],
];
export const FAIRNESS = { fairDiff:5, fairSoftDiff:10, fairSoftPct:8, slightDiff:20, slightPct:20 };
```

---

## 5. Breakdown contract (preserve Rachel's transparency)

`scoreTag` returns:
```ts
interface ScoreBreakdown {
  total: number;                  // rounded sum, 0..100
  grade: { grade: string; label: string; color: string };
  components: {
    scarcity:   { points: number; tier: GradeTier; label: string };
    popularity: { points: number; popScore: number; source: "poll"|"agg"|"search"|"default"; label: string };
    market:     { points: number; medianPrice: number; confidence: number; label: string };
    mechanic:   { points: number; flags: string[]; label: string };
  };
}
```
The UI maps `components` directly to rows. Keep `label` bilingual-ready (the app supplies
locale; labels are message keys, not hardcoded zh/en — tag NAMES are data, UI labels are i18n).

---

## 6. The two-axis test this must satisfy (from the Notion plan)

> "A recent Mewtwo tag can out-value a rarer Arceus tag because franchise popularity
> outweighs tag scarcity."

Using the ACTUAL v1 seed tags (verified — note both are `super-rare`, which the
Notion summary got wrong):
- Arceus `2-1-009`: rarity `super-rare`, price [1500,3000], atk 192, popScore 8.
- Mewtwo `2-1-008`: rarity `super-rare`, price [800,2000], atk 184, popScore 10.

Under Rachel's model they TIE at 94/94 (same rarity+acq, both max market, both hit
rare-slot+legendary+highAtk bonuses; popularity invisible).

Under the rebalance (computed with the §3 initial numbers):
- Popularity-blind: Arceus 67, Mewtwo 68 (Mewtwo +1, from market step only).
- With popularity: Arceus 87, Mewtwo 93 — **Mewtwo wins by 6**, driven entirely by
  the popularity axis (10 vs 8 -> 25 vs 20 pts).

So popularity moves the pair from a dead tie to a clear Mewtwo lead. The assertion:
**`score(mewtwo) - score(arceus)` is strictly greater WITH popularity than WITHOUT**
(here: +6 vs +1, i.e. popularity adds 5 pts of Mewtwo advantage). This is the
two-axis insight made concrete. (For a case where scarcity and popularity actively
fight — a rarer-but-less-loved tag vs a common-but-beloved one — add a synthetic
fixture; the seed's two legendaries happen to share a rarity tier.)

---

## 7. Required tests (`score.test.ts`)

1. **Baseline parity (optional but recommended):** a frozen table of ~10 tags scored
   under Rachel's exact §2 model, to prove the port before rebalancing.
2. **Rebalance ceilings:** no component exceeds its cap; total in 0..100.
3. **Two-axis:** `score(mewtwo) - score(arceus)` WITH popularity is strictly greater
   than the same difference computed with popularity zeroed (§6: +6 vs +1).
4. **Unconfirmed price damping:** same tag scores lower market with confidence 0.6.
5. **Missing-popularity fallback:** unknown species → DEFAULT_POPULARITY, source "default".
6. **Fairness bands:** equal baskets → Fair; +18 diff → Slight; +40 diff → Unfair (§2f).
7. **Grade bands:** boundary values 89/90, 74/75, etc. land in the right grade.

---

## 8. Inputs from elsewhere (so CC isn't blocked)

- **`popularity.json`** — already generated (259 species, `{score, source, sourceNote, dex, gen}`),
  consumed by the catalog layer and passed into `scoreTag` as the popularity lookup.
- **`species-map.ts`** — already generated; M1 uses `deriveSpecies()` so the migrated tags'
  species keys match the popularity map exactly (verified: 259 == 259, no orphans).
- **`mechanics`** — M1 derives this from `note`/`enName` ONCE using the §2d patterns,
  emitting structured flags. The scoring engine reads flags, never raw note text.
