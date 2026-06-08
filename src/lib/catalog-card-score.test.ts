import { describe, expect, it } from 'vitest';

import type { ScoreBreakdown } from '@/data/catalog';
import { deriveCardScore } from './catalog-card-score';

/** Minimal ScoreBreakdown factory — only the fields deriveCardScore reads matter. */
function breakdown(
  total: number,
  marketPoints: number,
  medianPrice: number,
  confidence = 1,
): ScoreBreakdown {
  return {
    total,
    grade: { grade: 'B', label: 'scoring.grade.B', color: '#000' },
    components: {
      scarcity: { points: 0, tier: 'normal-3', label: 'scoring.component.scarcity' },
      popularity: { points: 0, popScore: 5, source: 'default', label: 'scoring.component.popularity' },
      market: {
        points: marketPoints,
        medianPrice,
        confidence,
        label: 'scoring.component.market',
      },
      mechanic: { points: 0, flags: [], label: 'scoring.component.mechanic' },
    },
  };
}

describe('deriveCardScore', () => {
  it('passes the collector total and rounded median price through verbatim', () => {
    const result = deriveCardScore(breakdown(73, 10, 120.5));
    expect(result.collector).toBe(73);
    expect(result.marketPrice).toBe(121);
  });

  it('reads "even" when cash standing tracks collector standing', () => {
    // total 90 (0.90) vs market 18/18 (1.0) → delta 0.10 ≤ tolerance.
    expect(deriveCardScore(breakdown(90, 18, 1800)).marketParity).toBe('even');
  });

  it('reads "market-rich" when cash outruns collector merit', () => {
    // total 30 (0.30) vs market 15/18 (0.83) → delta +0.53.
    expect(deriveCardScore(breakdown(30, 15, 1000)).marketParity).toBe('market-rich');
  });

  it('reads "market-poor" when collector merit outruns cash', () => {
    // total 80 (0.80) vs market 3/18 (0.17) → delta -0.63.
    expect(deriveCardScore(breakdown(80, 3, 50)).marketParity).toBe('market-poor');
  });

  it('flags unverified prices from the market confidence', () => {
    expect(deriveCardScore(breakdown(40, 6, 100, 0.6)).marketUnverified).toBe(true);
    expect(deriveCardScore(breakdown(40, 6, 100, 1)).marketUnverified).toBe(false);
  });
});
