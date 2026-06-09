import { describe, expect, it } from 'vitest';

import g1 from '@/data/packs/g1.json';
import s1 from '@/data/packs/s1.json';
import s2 from '@/data/packs/s2.json';
import s3 from '@/data/packs/s3.json';
import s4 from '@/data/packs/s4.json';
import sp from '@/data/packs/sp.json';
import popularity from '@/data/popularity.json';
import scarcity from '@/data/scarcity.json';

import { scoreBasket, scoreTag } from './score';
import { judgeFairness } from './fairness';
import { gradeOf } from './grade';
import {
  DEFAULT_POPULARITY,
  MARKET_CAP,
  MECHANIC_CAP,
  POPULARITY_CAP,
  SCARCITY_CAP,
  SCARCITY_RANK_CAP,
} from './weights';
import type {
  BasketScore,
  PopularityLookup,
  PopularitySource,
  ScarcityLookup,
  ScorableTag,
} from './types';

// ---- Fixtures from the real migrated seed ---------------------------------

const ALL_TAGS = [
  ...g1.tags,
  ...s1.tags,
  ...s2.tags,
  ...s3.tags,
  ...s4.tags,
  ...sp.tags,
] as unknown as ScorableTag[];

function tag(num: string): ScorableTag {
  const t = (g1.tags as unknown as ScorableTag[]).find((x) => (x as unknown as { num: string }).num === num);
  if (!t) throw new Error(`fixture tag ${num} not found`);
  return t;
}

function tagById(tagId: string): ScorableTag {
  const t = ALL_TAGS.find((x) => x.tagId === tagId);
  if (!t) throw new Error(`fixture tag ${tagId} not found`);
  return t;
}

const MEWTWO = tag('2-1-008');
const ARCEUS = tag('2-1-009');

// Real popularity lookup, built from popularity.json (the catalog layer's job).
const pop = popularity as Record<string, { score: number; source: string }>;
const realLookup: PopularityLookup = (species) => {
  const row = pop[species];
  return row ? { score: row.score, source: row.source as PopularitySource } : undefined;
};
// Popularity-blind lookup: every species resolves to 0 points.
const zeroLookup: PopularityLookup = () => ({ score: 0, source: 'agg' });

// Real scarcity-rank lookup, built from scarcity.json (the catalog layer's job).
const scarcityRanks = (scarcity as { ranks: Record<string, { scarcityRank: number }> }).ranks;
const realScarcity: ScarcityLookup = (tagId) => scarcityRanks[tagId]?.scarcityRank ?? 0;
// Scarcity-blind lookup: every tag gets delta 0 (isolates the other axes).
const zeroScarcity: ScarcityLookup = () => 0;

// ---- §7.1 Baseline parity: Rachel's exact §2 model -> Mewtwo == Arceus == 94

function rachelScore(t: ScorableTag): number {
  const RARITY: Record<string, number> = {
    'super-rare': 45, classic: 40, 'gold-star': 32, featured: 27, 'normal-5': 25,
    special: 22, 'normal-4': 20, 'normal-3': 11, 'normal-2': 5,
  };
  const ACQ: Record<string, number> = {
    'super-rare': 10, classic: 9, 'gold-star': 8, special: 7, featured: 5,
    'normal-5': 4, 'normal-4': 2, 'normal-3': 1, 'normal-2': 0,
  };
  const rarity = RARITY[t.gradeTier] ?? 8;
  const acq = ACQ[t.gradeTier] ?? 0;
  const median = ((t.price[0] ?? 0) + (t.price[1] ?? 0)) / 2;
  const market =
    median >= 1800 ? 30 : median >= 1000 ? 26 : median >= 500 ? 22 : median >= 250 ? 16 : median >= 100 ? 10 : median >= 40 ? 5 : 2;
  // Reads the raw seed mechanics, incl. the now-unscored `rareSlot`, to reproduce
  // the historical §2 baseline. `rareSlot` was removed from the MechanicFlag union
  // (M-scarcity) but the boolean still lives in the fixture data.
  const m = t.mechanics as Record<string, boolean>;
  const special = Math.min(
    15,
    (m.gigantamax ? 4 : 0) + (m.mega ? 4 : 0) + (m.rareSlot ? 4 : 0) + (m.zMove ? 3 : 0) +
      (m.legendary ? 3 : 0) + (m.classic ? 3 : 0) + (m.highAtk ? 2 : 0),
  );
  return rarity + acq + market + special;
}

describe('§7.1 baseline parity (Rachel §2 model)', () => {
  it('scores Mewtwo and Arceus as a 94/94 tie (popularity invisible)', () => {
    expect(rachelScore(MEWTWO)).toBe(94);
    expect(rachelScore(ARCEUS)).toBe(94);
  });
});

// ---- §7.2 Rebalance ceilings ----------------------------------------------

describe('§7.2 rebalance ceilings', () => {
  it('keeps every component within its cap and total in 0..100, across all packs', () => {
    for (const t of ALL_TAGS) {
      const s = scoreTag(t, realLookup, realScarcity);
      // Ranked headliners may exceed the tier cap (40) up to SCARCITY_RANK_CAP (50).
      expect(s.components.scarcity.points).toBeLessThanOrEqual(SCARCITY_RANK_CAP);
      expect(s.components.popularity.points).toBeLessThanOrEqual(POPULARITY_CAP);
      expect(s.components.market.points).toBeLessThanOrEqual(MARKET_CAP);
      expect(s.components.mechanic.points).toBeLessThanOrEqual(MECHANIC_CAP);
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(100);
      // Transparency invariant: displayed rows sum to the headline total.
      const sum =
        s.components.scarcity.points + s.components.popularity.points +
        s.components.market.points + s.components.mechanic.points;
      expect(sum).toBe(s.total);
    }
  });
});

// ---- §7.3 Two-axis: popularity widens Mewtwo's lead -----------------------

// Scarcity rank is held at zero here to isolate the popularity axis (the headline
// regression — where scarcity rank flips the verdict — is §7.8 below). Totals are
// 4 points below the pre-M-scarcity spec because `rareSlot` (+4) left the mechanic
// axis; the popularity-widening property is unchanged (the −4 cancels in the diff).
describe('§7.3 two-axis (Mewtwo vs Arceus), scarcity-rank held at zero', () => {
  it('reproduces the popularity-axis totals exactly', () => {
    expect(scoreTag(ARCEUS, zeroLookup, zeroScarcity).total).toBe(63);
    expect(scoreTag(MEWTWO, zeroLookup, zeroScarcity).total).toBe(64);
    expect(scoreTag(ARCEUS, realLookup, zeroScarcity).total).toBe(83);
    expect(scoreTag(MEWTWO, realLookup, zeroScarcity).total).toBe(89);
  });

  it('makes score(mewtwo) - score(arceus) strictly greater WITH popularity than WITHOUT', () => {
    const withPop =
      scoreTag(MEWTWO, realLookup, zeroScarcity).total - scoreTag(ARCEUS, realLookup, zeroScarcity).total;
    const withoutPop =
      scoreTag(MEWTWO, zeroLookup, zeroScarcity).total - scoreTag(ARCEUS, zeroLookup, zeroScarcity).total;
    expect(withPop).toBe(6);
    expect(withoutPop).toBe(1);
    expect(withPop).toBeGreaterThan(withoutPop);
  });
});

// ---- §7.8 M-scarcity: per-tag scarcityRank flips Arceus above Mewtwo ---------

describe('§7.8 scarcityRank (the headline regression)', () => {
  it('ranks Arceus ABOVE Mewtwo once per-tag scarcity is applied (93 vs 91)', () => {
    const arceus = scoreTag(ARCEUS, realLookup, realScarcity).total;
    const mewtwo = scoreTag(MEWTWO, realLookup, realScarcity).total;
    expect(arceus).toBe(93);
    expect(mewtwo).toBe(91);
    expect(arceus).toBeGreaterThan(mewtwo);
  });

  it('exposes Arceus scarcity as base 40 + rankDelta 10 = 50 (super-rare apex)', () => {
    const sc = scoreTag(ARCEUS, realLookup, realScarcity).components.scarcity;
    expect(sc.base).toBe(40);
    expect(sc.rankDelta).toBe(10);
    expect(sc.points).toBe(50);
  });

  it('exposes Mewtwo scarcity as base 40 + rankDelta 2 = 42', () => {
    const sc = scoreTag(MEWTWO, realLookup, realScarcity).components.scarcity;
    expect(sc.base).toBe(40);
    expect(sc.rankDelta).toBe(2);
    expect(sc.points).toBe(42);
  });

  it('lifts a ranked gold-star (Rayquaza s4-1-4-010) to base 28 + rankDelta 10 = 38', () => {
    const sc = scoreTag(tagById('s4-1-4-010'), realLookup, realScarcity).components.scarcity;
    expect(sc.tier).toBe('gold-star');
    expect(sc.base).toBe(28);
    expect(sc.rankDelta).toBe(10);
    expect(sc.points).toBe(38);
  });

  it('leaves an unranked normal-2 tag scoring on the tier base alone (delta 0, cap 40)', () => {
    const normal2 = ALL_TAGS.find(
      (t) => t.gradeTier === 'normal-2' && realScarcity(t.tagId) === 0,
    );
    if (!normal2) throw new Error('no unranked normal-2 fixture found');
    const withRank = scoreTag(normal2, realLookup, realScarcity).components.scarcity;
    const blind = scoreTag(normal2, realLookup, zeroScarcity).components.scarcity;
    expect(withRank.rankDelta).toBe(0);
    expect(withRank.points).toBe(blind.points);
    expect(withRank.points).toBe(withRank.base);
    expect(withRank.points).toBeLessThanOrEqual(SCARCITY_CAP);
  });

  it('no longer scores rareSlot in the mechanic axis (rareSlot-only tag → 0 mechanic)', () => {
    const onlyRareSlot: ScorableTag = {
      ...MEWTWO,
      mechanics: {
        gigantamax: false,
        mega: false,
        zMove: false,
        legendary: false,
        classic: false,
        highAtk: false,
        // rareSlot stays in the data but is no longer a MechanicFlag.
        rareSlot: true,
      } as unknown as ScorableTag['mechanics'],
    };
    const s = scoreTag(onlyRareSlot, zeroLookup, zeroScarcity);
    expect(s.components.mechanic.points).toBe(0);
    expect(s.components.mechanic.flags).toHaveLength(0);
  });

  it('keeps the scarcity breakdown transparent: base + rankDelta === points for every tag', () => {
    for (const t of ALL_TAGS) {
      const sc = scoreTag(t, realLookup, realScarcity).components.scarcity;
      expect(sc.base + sc.rankDelta).toBe(sc.points);
    }
  });
});

// ---- §7.4 Unconfirmed price damping ---------------------------------------

describe('§7.4 unconfirmed price damping', () => {
  it('scores lower market with confidence 0.6 than at 1.0', () => {
    const confident = scoreTag(MEWTWO, realLookup, zeroScarcity);
    const damped = scoreTag({ ...MEWTWO, priceConfidence: 0.6 }, realLookup, zeroScarcity);
    expect(damped.components.market.points).toBeLessThan(confident.components.market.points);
    expect(damped.total).toBeLessThan(confident.total);
  });
});

// ---- §7.5 Missing-popularity fallback -------------------------------------

describe('§7.5 missing-popularity fallback', () => {
  it('falls back to DEFAULT_POPULARITY with source "default"', () => {
    const unknownSpecies: ScorableTag = { ...MEWTWO, species: ['NotARealSpecies'] };
    const s = scoreTag(unknownSpecies, () => undefined, zeroScarcity);
    expect(s.components.popularity.source).toBe('default');
    expect(s.components.popularity.popScore).toBe(DEFAULT_POPULARITY);
    expect(s.components.popularity.points).toBe(Math.round(DEFAULT_POPULARITY * 2.5)); // 13
  });
});

// ---- §7.6 Fairness bands ---------------------------------------------------

function basket(total: number, medianPriceSum = 0): BasketScore {
  return { total, medianPriceSum, tags: [] };
}

describe('§7.6 fairness bands', () => {
  it('equal baskets -> fair', () => {
    expect(judgeFairness(basket(100), basket(100)).verdict).toBe('fair');
  });
  it('+18 diff -> slight', () => {
    expect(judgeFairness(basket(100), basket(118)).verdict).toBe('slight');
  });
  it('+40 diff -> unfair', () => {
    expect(judgeFairness(basket(100), basket(140)).verdict).toBe('unfair');
  });
  it('reports richer and paying sides from score and market respectively', () => {
    const v = judgeFairness(basket(100, 500), basket(140, 900));
    expect(v.richerSide).toBe('right');
    expect(v.payingSide).toBe('left'); // cheaper basket tops up
    expect(v.priceGap).toBe(400);
  });
});

// ---- §7.7 Grade bands ------------------------------------------------------

describe('§7.7 grade bands (boundaries)', () => {
  const cases: Array<[number, string]> = [
    [90, 'S'], [89, 'A'], [75, 'A'], [74, 'B'], [60, 'B'], [59, 'C'],
    [40, 'C'], [39, 'D'], [20, 'D'], [19, 'F'], [0, 'F'],
  ];
  for (const [score, grade] of cases) {
    it(`${score} -> ${grade}`, () => {
      expect(gradeOf(score).grade).toBe(grade);
    });
  }
});
