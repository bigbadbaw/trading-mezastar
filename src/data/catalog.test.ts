import { describe, expect, it } from 'vitest';

import {
  getCatalogPacks,
  getScoredCatalog,
  getScoredTag,
} from './catalog';

describe('catalog accessor', () => {
  it('returns all 381 scored tags', () => {
    expect(getScoredCatalog()).toHaveLength(381);
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
    expect(sp?.migratedCount).toBe(10);
    expect(sp?.officialTotal).toBe(50);
  });

  it('adds the 4 Taiwan Special event tags to the sp pack', () => {
    const spTags = getScoredCatalog().filter((e) => e.tag.pack === 'sp');
    expect(spTags).toHaveLength(10);

    const ray = getScoredTag('sp-EV-RAY');
    expect(ray).toBeDefined();
    expect(ray!.tag.gradeTier).toBe('special');
    expect(ray!.tag.energy).toBe(110);
    expect(ray!.tag.types).toEqual(['dragon', 'flying']);
  });

  it('scores all 4 new special event tags without throwing (popularity joins)', () => {
    for (const id of ['sp-EV-RAY', 'sp-EV-KYU', 'sp-EV-ZEK', 'sp-EV-RES']) {
      const scored = getScoredTag(id);
      expect(scored, id).toBeDefined();
      expect(Number.isFinite(scored!.score.total), id).toBe(true);
    }
  });

  it('adds the batch-2 Special event tags (Jirachi x2 variants + TC Gyarados)', () => {
    const expected: Record<string, number> = {
      'sp-EV-JIR-G': 124,
      'sp-EV-JIR-S': 124,
      'sp-EV-GYA': 134,
    };
    for (const [id, energy] of Object.entries(expected)) {
      const scored = getScoredTag(id);
      expect(scored, id).toBeDefined();
      expect(scored!.tag.gradeTier, id).toBe('special');
      expect(scored!.tag.energy, id).toBe(energy);
      // popularity default path (Jirachi/Gyarados absent from popularity.json) must not throw
      expect(Number.isFinite(scored!.score.total), id).toBe(true);
    }
  });

  it('keeps the two Jirachi border variants as distinct tags on one species', () => {
    const gold = getScoredTag('sp-EV-JIR-G');
    const silver = getScoredTag('sp-EV-JIR-S');
    expect(gold).toBeDefined();
    expect(silver).toBeDefined();
    expect(gold!.tag.tagId).not.toBe(silver!.tag.tagId);
    expect(gold!.tag.species).toEqual(['Jirachi']);
    expect(silver!.tag.species).toEqual(['Jirachi']);
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
