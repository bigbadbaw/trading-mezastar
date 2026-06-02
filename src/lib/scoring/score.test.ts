import { describe, expect, it } from 'vitest';

import g1 from '@/data/packs/g1.json';
import s1 from '@/data/packs/s1.json';
import s2 from '@/data/packs/s2.json';
import s3 from '@/data/packs/s3.json';
import s4 from '@/data/packs/s4.json';
import sp from '@/data/packs/sp.json';
import popularity from '@/data/popularity.json';

import { scoreBasket, scoreTag } from './score';
import { judgeFairness } from './fairness';
import { gradeOf } from './grade';
import {
  DEFAULT_POPULARITY,
  MARKET_CAP,
  MECHANIC_CAP,
  POPULARITY_CAP,
  SCARCITY_CAP,
} from './weights';
import type { BasketScore, PopularityLookup, PopularitySource, ScorableTag } from './types';

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
  const m = t.mechanics;
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
      const s = scoreTag(t, realLookup);
      expect(s.components.scarcity.points).toBeLessThanOrEqual(SCARCITY_CAP);
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

describe('§7.3 two-axis (Mewtwo vs Arceus)', () => {
  it('reproduces the spec totals exactly', () => {
    expect(scoreTag(ARCEUS, zeroLookup).total).toBe(67);
    expect(scoreTag(MEWTWO, zeroLookup).total).toBe(68);
    expect(scoreTag(ARCEUS, realLookup).total).toBe(87);
    expect(scoreTag(MEWTWO, realLookup).total).toBe(93);
  });

  it('makes score(mewtwo) - score(arceus) strictly greater WITH popularity than WITHOUT', () => {
    const withPop = scoreTag(MEWTWO, realLookup).total - scoreTag(ARCEUS, realLookup).total;
    const withoutPop = scoreTag(MEWTWO, zeroLookup).total - scoreTag(ARCEUS, zeroLookup).total;
    expect(withPop).toBe(6);
    expect(withoutPop).toBe(1);
    expect(withPop).toBeGreaterThan(withoutPop);
  });
});

// ---- §7.4 Unconfirmed price damping ---------------------------------------

describe('§7.4 unconfirmed price damping', () => {
  it('scores lower market with confidence 0.6 than at 1.0', () => {
    const confident = scoreTag(MEWTWO, realLookup);
    const damped = scoreTag({ ...MEWTWO, priceConfidence: 0.6 }, realLookup);
    expect(damped.components.market.points).toBeLessThan(confident.components.market.points);
    expect(damped.total).toBeLessThan(confident.total);
  });
});

// ---- §7.5 Missing-popularity fallback -------------------------------------

describe('§7.5 missing-popularity fallback', () => {
  it('falls back to DEFAULT_POPULARITY with source "default"', () => {
    const unknownSpecies: ScorableTag = { ...MEWTWO, species: ['NotARealSpecies'] };
    const s = scoreTag(unknownSpecies, () => undefined);
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
