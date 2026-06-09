import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { getScoredTag, type ScoredTag } from '@/data/catalog';
import { compareBaskets, type BasketLine } from '@/lib/compare/basket';

import { VerdictPanel } from './VerdictPanel';
import en from '../../../messages/en.json';

// The repo's first component render test — closing the gap that let the picker
// bug hide. Renders server-side via `renderToStaticMarkup` (no jsdom needed) so
// it stays in the `node` test environment; next-intl messages come from the real
// `en.json`, so a missing/renamed key would surface here too.

function entry(tagId: string): ScoredTag {
  const e = getScoredTag(tagId);
  if (!e) throw new Error(`fixture tag ${tagId} not found`);
  return e;
}
const line = (e: ScoredTag, quantity = 1): BasketLine => ({ entry: e, quantity });

function render(mine: ScoredTag, theirs: ScoredTag): string {
  const result = compareBaskets([line(mine)], [line(theirs)]);
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={en}>
      <VerdictPanel result={result} />
    </NextIntlClientProvider>,
  );
}

const ENTEI = entry('g1-2-1-006'); // 59, NT$900, UNVERIFIED
const MEWTWO = entry('g1-2-1-008'); // 91, NT$1400 (M-scarcity: was 93)
const STAKATAKA = entry('s3-1-3-009'); // 61, NT$1350 (score-even vs Entei, verified)

describe('VerdictPanel — DIVERGE state (Entei vs Stakataka)', () => {
  // Tyranitar (the former partner) is now an M-scarcity headliner scoring 67,
  // outside Entei's even band; Stakataka recreates the score-even/market-theirs shape.
  const html = render(ENTEI, STAKATAKA);

  it('shows the collector verdict a kid reads (scores are near-even -> fair)', () => {
    expect(html).toContain('Collector value');
    expect(html).toContain('Fair trade');
  });

  it('renders the divergence synthesis as informative signal, not an error', () => {
    expect(html).toContain('Even on collector value');
    expect(html).toContain('their side is worth about NT$450 more at market');
    // Not the agree/reinforce framings.
    expect(html).not.toContain('Fair on both collector value and market');
    expect(html).not.toContain('ahead on both');
  });

  it('surfaces the cash gap as a co-equal, clearly-labeled market figure', () => {
    expect(html).toContain('Market value (cash)');
    expect(html).toContain('Their side is worth about NT$450 more');
  });

  it('honors the unverified-price flag on the soft market figure', () => {
    expect(html).toContain('leans on unverified prices');
  });
});

describe('VerdictPanel — other states', () => {
  it('REINFORCE: Entei vs Mewtwo reads as one side ahead on both axes', () => {
    const html = render(ENTEI, MEWTWO);
    expect(html).toContain('Their side is ahead on both collector value and market');
    expect(html).toContain('Unfair trade'); // 32-pt score gap (Entei 59 vs Mewtwo 91)
  });

  it('AGREE: identical baskets collapse to a single clean fair verdict', () => {
    const html = render(MEWTWO, MEWTWO);
    expect(html).toContain('Fair on both collector value and market');
    expect(html).not.toContain('leans on unverified prices');
  });
});
