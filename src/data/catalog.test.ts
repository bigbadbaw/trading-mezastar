import { describe, expect, it } from 'vitest';

import {
  getCatalogPacks,
  getScoredCatalog,
  getScoredTag,
} from './catalog';

describe('catalog accessor', () => {
  it('returns all 374 scored tags', () => {
    expect(getScoredCatalog()).toHaveLength(374);
  });

  it('assigns a unique tagId to every tag', () => {
    const ids = getScoredCatalog().map((e) => e.tag.tagId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates every pack and reports honest migrated vs official counts', () => {
    // build() calls PackSchema.parse on each pack; reaching here means it passed.
    const packs = getCatalogPacks();
    expect(packs).toHaveLength(6);
    const sp = packs.find((p) => p.pack === 'sp');
    expect(sp).toBeDefined();
    expect(sp?.migratedCount).toBe(3);
    expect(sp?.officialTotal).toBe(50);
  });

  it('round-trips a tag through getScoredTag by tagId', () => {
    const first = getScoredCatalog()[0];
    expect(first).toBeDefined();
    const tagId = first!.tag.tagId;
    const looked = getScoredTag(tagId);
    expect(looked).toBeDefined();
    expect(looked!.tag.tagId).toBe(tagId);
  });

  it('returns undefined for an unknown tagId', () => {
    expect(getScoredTag('does-not-exist')).toBeUndefined();
  });

  it('keeps both species on the dual-tag (Lunatone/Solrock)', () => {
    const dual = getScoredTag('s2-1-2-065');
    expect(dual).toBeDefined();
    expect(dual!.tag.species).toEqual(['Lunatone', 'Solrock']);
  });

  it('carries an unconfirmed price confidence (0.6) into the score breakdown', () => {
    const ev = getScoredTag('sp-EV-LUC');
    expect(ev).toBeDefined();
    expect(ev!.tag.priceConfidence).toBe(0.6);
    expect(ev!.score.components.market.confidence).toBe(0.6);
  });

  it('memoizes the catalog (same array instance across calls)', () => {
    expect(getScoredCatalog()).toBe(getScoredCatalog());
  });
});
