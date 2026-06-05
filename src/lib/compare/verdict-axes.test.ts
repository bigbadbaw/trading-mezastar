import { describe, expect, it } from 'vitest';

import { getScoredTag, type ScoredTag } from '@/data/catalog';

import { compareBaskets, type BasketLine } from './basket';
import { deriveVerdictAxes } from './verdict-axes';

// ---- Real catalog fixtures (values verified against the scoring engine) -----
//   Entei     g1-2-1-006 -> total 59, median 900,  UNVERIFIED (conf 0.6)
//   Mewtwo    g1-2-1-008 -> total 93, median 1400
//   Arceus    g1-2-1-009 -> total 87, median 2250
//   Tyranitar s1-1-1-005 -> total 63, median 1500
//   Eternatus s3-1-3-007 -> total 64, median 1950

function entry(tagId: string): ScoredTag {
  const e = getScoredTag(tagId);
  if (!e) throw new Error(`fixture tag ${tagId} not found`);
  return e;
}
const line = (e: ScoredTag, quantity = 1): BasketLine => ({ entry: e, quantity });

const ENTEI = entry('g1-2-1-006');
const MEWTWO = entry('g1-2-1-008');
const ARCEUS = entry('g1-2-1-009');
const TYRANITAR = entry('s1-1-1-005');
const ETERNATUS = entry('s3-1-3-007');

/** mine vs theirs -> the derived two-axis state. */
const axesOf = (mine: ScoredTag, theirs: ScoredTag) =>
  deriveVerdictAxes(compareBaskets([line(mine)], [line(theirs)]));

describe('deriveVerdictAxes — agreement state machine', () => {
  it('AGREE: score-fair and market-even collapse to one fair verdict', () => {
    const a = axesOf(MEWTWO, MEWTWO);
    expect(a.agreement).toBe('agree');
    expect(a.scoreDirection).toBe('even');
    expect(a.marketDirection).toBe('even');
    expect(a.marketGap).toBe(0);
  });

  it('REINFORCE: both axes favor their side (Entei vs Mewtwo — the real spec pair)', () => {
    // Entei 59 vs Mewtwo 93 is a 34-pt `unfair` gap AND Mewtwo is worth more cash,
    // so both axes point the same way — this is reinforcement, not divergence.
    const a = axesOf(ENTEI, MEWTWO);
    expect(a.agreement).toBe('reinforce');
    expect(a.scoreDirection).toBe('theirs');
    expect(a.marketDirection).toBe('theirs');
  });
});

describe('deriveVerdictAxes — the six DIVERGE shapes', () => {
  it('score even, market favors theirs (Entei vs Tyranitar) — and flags unverified', () => {
    const a = axesOf(ENTEI, TYRANITAR);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('even');
    expect(a.marketDirection).toBe('theirs');
    expect(a.marketGap).toBe(600);
    expect(a.marketUnverified).toBe(true); // Entei's price is unverified
  });

  it('score even, market favors theirs (Mewtwo vs Arceus) — verified prices', () => {
    const a = axesOf(MEWTWO, ARCEUS);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('even');
    expect(a.marketDirection).toBe('theirs');
    expect(a.marketGap).toBe(850);
    expect(a.marketUnverified).toBe(false);
  });

  it('score even, market favors mine (Arceus vs Mewtwo)', () => {
    const a = axesOf(ARCEUS, MEWTWO);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('even');
    expect(a.marketDirection).toBe('mine');
  });

  it('score favors mine, market even (Mewtwo vs Tyranitar, gap exactly at the floor)', () => {
    const a = axesOf(MEWTWO, TYRANITAR);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('mine');
    expect(a.marketDirection).toBe('even'); // NT$100 gap == MARKET_EVEN.absFloor
  });

  it('score favors theirs, market even (Tyranitar vs Mewtwo)', () => {
    const a = axesOf(TYRANITAR, MEWTWO);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('theirs');
    expect(a.marketDirection).toBe('even');
  });

  it('opposite directions: mine scores higher, theirs worth more cash (Mewtwo vs Eternatus)', () => {
    const a = axesOf(MEWTWO, ETERNATUS);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('mine');
    expect(a.marketDirection).toBe('theirs');
  });

  it('opposite directions: theirs scores higher, mine worth more cash (Eternatus vs Mewtwo)', () => {
    const a = axesOf(ETERNATUS, MEWTWO);
    expect(a.agreement).toBe('diverge');
    expect(a.scoreDirection).toBe('theirs');
    expect(a.marketDirection).toBe('mine');
  });
});

describe('deriveVerdictAxes — market-even tolerance boundary', () => {
  it('a gap over the floor AND over the percent band reads as directional', () => {
    // Mewtwo vs Tyranitar is a NT$100 gap (== floor, even). Pikachu (450) vs
    // Flareon (600) is a NT$150 gap that also clears 10% of the larger basket,
    // so the market axis becomes directional.
    const PIKACHU = entry('s1-R-1-1'); // median 450
    const FLAREON = entry('s1-1-1-012'); // median 600
    const a = axesOf(PIKACHU, FLAREON);
    expect(a.marketGap).toBe(150);
    expect(a.marketDirection).toBe('theirs');
  });
});
