import { describe, expect, it } from 'vitest';

import { getScoredTag, type ScoredTag } from '@/data/catalog';

import { compareBaskets, scoreSide, type BasketLine } from './basket';

// ---- Real catalog fixtures (totals verified against the scoring engine) -----
//   Mewtwo  g1-2-1-008 -> total 91, median 1400  (M-scarcity: was 93; rareSlot -4, scarcityRank +2)
//   Arceus  g1-2-1-009 -> total 93, median 2250  (M-scarcity: was 87; rareSlot -4, scarcityRank +10)
//   Slowbro s1-1-1-054 -> total 19
//   Pinsir  g1-2-1-011 -> total 43
//   Dual    s2-1-2-065 -> total 18, species length 2 (Lunatone/Solrock)

function entry(tagId: string): ScoredTag {
  const e = getScoredTag(tagId);
  if (!e) throw new Error(`fixture tag ${tagId} not found`);
  return e;
}

const MEWTWO = entry('g1-2-1-008');
const ARCEUS = entry('g1-2-1-009');
const SLOWBRO = entry('s1-1-1-054');
const PINSIR = entry('g1-2-1-011');
const DUAL = entry('s2-1-2-065');

const line = (e: ScoredTag, quantity: number): BasketLine => ({ entry: e, quantity });

describe('scoreSide — basket totalling with quantity', () => {
  it('multiplies a tag total and median by its quantity', () => {
    const side = scoreSide([line(MEWTWO, 3)]);
    expect(side.basket.total).toBe(MEWTWO.score.total * 3); // 273
    expect(side.basket.medianPriceSum).toBe(
      MEWTWO.score.components.market.medianPrice * 3,
    ); // 4200
    expect(side.lines[0]?.lineTotal).toBe(273);
    // Expanded by quantity, matching scoreBasket's `tags` array.
    expect(side.basket.tags).toHaveLength(3);
  });

  it('sums distinct lines and respects per-line quantity', () => {
    const side = scoreSide([line(MEWTWO, 2), line(SLOWBRO, 1)]);
    expect(side.basket.total).toBe(MEWTWO.score.total * 2 + SLOWBRO.score.total); // 201
    expect(side.lines).toHaveLength(2);
  });

  it('ignores non-positive quantities', () => {
    const side = scoreSide([line(MEWTWO, 0), line(SLOWBRO, 2)]);
    expect(side.lines).toHaveLength(1);
    expect(side.basket.total).toBe(SLOWBRO.score.total * 2);
  });
});

describe('compareBaskets — the three verdict bands (real tags)', () => {
  it('equal baskets -> fair', () => {
    const r = compareBaskets([line(MEWTWO, 1)], [line(MEWTWO, 1)]);
    expect(r.verdict.diff).toBe(0);
    expect(r.verdict.verdict).toBe('fair');
  });

  it('~+18 gap -> slight (Mewtwo 91 vs Mewtwo+Slowbro 110)', () => {
    const r = compareBaskets([line(MEWTWO, 1)], [line(MEWTWO, 1), line(SLOWBRO, 1)]);
    expect(r.verdict.diff).toBe(19);
    expect(r.verdict.verdict).toBe('slight');
  });

  it('~+40 gap -> unfair (Mewtwo 91 vs Mewtwo+Pinsir 134)', () => {
    const r = compareBaskets([line(MEWTWO, 1)], [line(MEWTWO, 1), line(PINSIR, 1)]);
    expect(r.verdict.diff).toBe(43);
    expect(r.verdict.verdict).toBe('unfair');
  });

  it('reports richer side from score and paying side from market separately', () => {
    // Post-M-scarcity the two axes point to DIFFERENT sides: Arceus (right) now
    // scores higher (93 > 91) AND is worth more cash (2250 > 1400), so the richer
    // side is the right, while the cheaper left (Mewtwo) is the one that tops up.
    const r = compareBaskets([line(MEWTWO, 1)], [line(ARCEUS, 1)]);
    expect(r.verdict.richerSide).toBe('right');
    expect(r.verdict.payingSide).toBe('left');
    expect(r.verdict.priceGap).toBe(850);
  });
});

describe('dual-tag handling in a basket', () => {
  it('scores the dual-species tag and honors quantity', () => {
    expect(DUAL.tag.species).toHaveLength(2);
    const side = scoreSide([line(DUAL, 2)]);
    expect(side.basket.total).toBe(DUAL.score.total * 2); // 36
    expect(side.basket.tags).toHaveLength(2);
    expect(side.lines[0]?.entry.tag.species).toHaveLength(2);
  });

  it('compares a dual tag against a single-species tag without error', () => {
    const r = compareBaskets([line(DUAL, 1)], [line(SLOWBRO, 1)]);
    // 18 vs 19 -> diff 1 -> fair.
    expect(r.verdict.diff).toBe(1);
    expect(r.verdict.verdict).toBe('fair');
  });
});
