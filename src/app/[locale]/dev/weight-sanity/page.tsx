/**
 * /dev/weight-sanity — Pre-M4 scoring calibration tool.
 *
 * Guards itself to development only. Scores five realistic 3-tag baskets from
 * real pack data, surfaces verdicts that feel counter-intuitive to a parent or
 * child, and shows per-component breakdowns plus the impact of the two proposed
 * weight changes:
 *   1. SCARCITY_POINTS['normal-3']  : 8  → 12
 *   2. SCARCITY_POINTS['special']   : 24 → 29
 */
import { notFound } from 'next/navigation';

import g1Data from '@/data/packs/g1.json';
import s1Data from '@/data/packs/s1.json';
import spData from '@/data/packs/sp.json';
import popularityData from '@/data/popularity.json';
import { judgeFairness } from '@/lib/scoring/fairness';
import { scoreBasket, scoreTag } from '@/lib/scoring/score';
import type {
  BasketScore,
  FairnessVerdict,
  PopularityLookup,
  PopularitySource,
  ScorableTag,
  ScoreBreakdown,
} from '@/lib/scoring/types';
import {
  SCARCITY_POINTS,
  POPULARITY_MULTIPLIER,
  POPULARITY_CAP,
  MARKET_STEPS,
  MARKET_CAP,
  MECHANIC_POINTS,
  MECHANIC_CAP,
  SCARCITY_CAP,
  SCARCITY_FALLBACK,
  DEFAULT_POPULARITY,
} from '@/lib/scoring/weights';

// ── Guard ──────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

// ── Helpers ────────────────────────────────────────────────────────────────

const popMap = popularityData as Record<string, { score: number; source: string }>;

const popLookup: PopularityLookup = (species) => {
  const row = popMap[species];
  return row ? { score: row.score, source: row.source as PopularitySource } : undefined;
};

type RawTag = ScorableTag & { num: string; nameEn: string; grade?: number };

const allTags: RawTag[] = [
  ...(g1Data.tags as unknown as RawTag[]),
  ...(s1Data.tags as unknown as RawTag[]),
  ...(spData.tags as unknown as RawTag[]),
];

function byNum(num: string): RawTag {
  const t = allTags.find((x) => x.num === num);
  if (!t) throw new Error(`tag ${num} not in seed`);
  return t;
}

// ── Proposed-changes delta ─────────────────────────────────────────────────
// Two changes only; no market-step mutations (avoids regressions on other
// scenarios). Deltas are applied on top of the current engine's output.

const PROPOSED: Record<string, number> = {
  'normal-3': 12, // was 8  (+4)
  special: 29,    // was 24 (+5)
};

function proposedScarcity(tier: ScorableTag['gradeTier']): number {
  return PROPOSED[tier] ?? (SCARCITY_POINTS[tier] ?? SCARCITY_FALLBACK);
}

function scoreTagProposed(tag: ScorableTag): ScoreBreakdown {
  // Exact copy of scoreTag logic but uses proposedScarcity() instead.
  const clamp = (n: number, cap: number) => Math.max(0, Math.min(cap, n));

  const scarcityPoints = clamp(proposedScarcity(tag.gradeTier), SCARCITY_CAP);

  const { popScore, source } = (() => {
    let score = DEFAULT_POPULARITY;
    let src: PopularitySource = 'default';
    let found = false;
    for (const sp of tag.species) {
      const hit = popLookup(sp);
      if (hit && (!found || hit.score > score)) {
        score = hit.score;
        src = hit.source;
        found = true;
      }
    }
    return { popScore: score, source: src };
  })();
  const popularityPoints = clamp(Math.round(popScore * POPULARITY_MULTIPLIER), POPULARITY_CAP);

  const median = ((tag.price[0] ?? 0) + (tag.price[1] ?? tag.price[0] ?? 0)) / 2;
  const rawMarket = (() => {
    for (const [threshold, pts] of MARKET_STEPS) {
      if (median >= threshold) return pts;
    }
    return 0;
  })();
  const marketPoints = clamp(Math.round(rawMarket * tag.priceConfidence), MARKET_CAP);

  const flags = (Object.keys(tag.mechanics) as (keyof typeof tag.mechanics)[]).filter(
    (f) => tag.mechanics[f],
  );
  const mechanicPoints = clamp(
    flags.reduce((s, f) => s + (MECHANIC_POINTS[f] ?? 0), 0),
    MECHANIC_CAP,
  );

  const total = clamp(
    scarcityPoints + popularityPoints + marketPoints + mechanicPoints,
    100,
  );

  return {
    total,
    grade: { grade: '', label: '', color: '' }, // not needed in this tool
    components: {
      scarcity: { points: scarcityPoints, tier: tag.gradeTier, label: '' },
      popularity: { points: popularityPoints, popScore, source, label: '' },
      market: { points: marketPoints, medianPrice: median, confidence: tag.priceConfidence, label: '' },
      mechanic: { points: mechanicPoints, flags: flags as import('@/lib/scoring/types').MechanicFlag[], label: '' },
    },
  };
}

function scoreBasketProposed(tags: readonly ScorableTag[]): BasketScore {
  const scored = tags.map((t) => scoreTagProposed(t));
  return {
    total: scored.reduce((s, t) => s + t.total, 0),
    medianPriceSum: scored.reduce((s, t) => s + t.components.market.medianPrice, 0),
    tags: scored,
  };
}

// ── Scenario definitions ───────────────────────────────────────────────────

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  /** Tuple [leftNums, rightNums] */
  baskets: [string[], string[]];
  leftLabel: string;
  rightLabel: string;
  /** Optional annotation surfacing why this verdict might feel wrong */
  issue?: string;
  /** Set true when this scenario validates correct behaviour (no issue) */
  isValidation?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'beloved-commons',
    title: '1. Beloved Grade-3 Commons vs Obscure Grade-5s',
    subtitle:
      'Classic "feels wrong" case: three beloved Pikachus vs three obscure Grade-5 tags. ' +
      'Popularity (pop 9 vs 4) almost cancels scarcity, but not quite.',
    baskets: [
      ['1-1-042', '1-1-042', '1-1-042'],   // 3× s1 Pikachu normal-3
      ['2-1-024', '2-1-019', '2-1-020'],   // Lokix, Electivire, Magmortar normal-5
    ],
    leftLabel: '3× Pikachu (Grade 3, pop 9)',
    rightLabel: 'Lokix + Electivire + Magmortar (Grade 5, pop 4–5)',
    issue:
      'A parent sees three iconic Pikachus judged as "worth less" than obscure beetles and ' +
      'electric lizards. The scarcity gap (8 vs 20) overrides the 13-pt popularity advantage. ' +
      'FIX: raise normal-3 scarcity 8 → 12.',
  },
  {
    id: 'event-exclusives',
    title: '2. Event-Exclusive Special Tags vs Standard Gold-Stars',
    subtitle:
      'SP event tags (special gradeTier, unconfirmed price) score below regular ' +
      'gold-star grade-5 pulls. Children understand "event = rare" but the model says otherwise.',
    baskets: [
      ['EV-LUC', 'EV-MMQ', 'EV-DRG'],         // SP event Lucario / Mimikyu / Dragonite
      ['2-1-001', '2-1-002', '2-1-007'],        // G1 gold-star Rillaboom / Cinderace / Suicune
    ],
    leftLabel: 'SP Event: Lucario + Mimikyu + Dragonite (special, conf 0.6)',
    rightLabel: 'G1 Gold-Star: Rillaboom + Cinderace + Suicune',
    issue:
      'special (24) scores below gold-star (28) in scarcity even though event tags require ' +
      'physical attendance at a limited event. FIX: raise special scarcity 24 → 29, ' +
      'placing it just above gold-star.',
  },
  {
    id: 'two-axis-mewtwo',
    title: '3. Popularity Axis Validation: Mewtwo vs Arceus + Padding',
    subtitle:
      'Both tags are super-rare Grade 6. Mewtwo (pop 10) beats Arceus (pop 8) purely via ' +
      'the popularity axis. Neither tier is changed — this should remain unchanged after our fixes.',
    baskets: [
      ['2-1-008', '2-1-065', '2-1-065'],   // G1 Mewtwo + 2× Nidoran♀ padding
      ['2-1-009', '2-1-065', '2-1-065'],   // G1 Arceus + 2× Nidoran♀ padding
    ],
    leftLabel: 'Mewtwo (super-rare, pop 10) + 2× Nidoran♀',
    rightLabel: 'Arceus  (super-rare, pop 8)  + 2× Nidoran♀',
    isValidation: true,
  },
  {
    id: 'featured-cash-anchor',
    title: '4. Featured Icons vs Normal-5 Obscure — Cash Anchor in Action',
    subtitle:
      'Featured Pikachu / Charizard / Gengar have high popularity but low market prices ' +
      '(~175 NT$ median). The obscure Grade-5 tags have the opposite profile. ' +
      'Score and market disagree — the cash-top-up feature resolves this cleanly.',
    baskets: [
      ['R-2-1', 'R-2-2', 'R-2-3'],           // G1 featured Pikachu / Charizard / Gengar
      ['2-1-024', '2-1-019', '2-1-018'],      // G1 normal-5 Lokix / Electivire / Dondozo
    ],
    leftLabel: 'G1 Featured: Pikachu + Charizard + Gengar',
    rightLabel: 'G1 Grade-5: Lokix + Electivire + Dondozo',
    issue:
      'Score says left (beloved icons) is richer; market says right (Grade-5s) is richer ' +
      'in NT$. Neither tier is affected by the proposed changes — the cash-anchor feature ' +
      'already handles this tension correctly by flagging which side should top up in cash.',
  },
  {
    id: 'popular-n4-vs-n5',
    title: '5. Popular Normal-4 Set vs Obscure Normal-5 Set',
    subtitle:
      'Tests whether a popular Grade-4 basket (Arcanine / Weavile / Cinderace) fairly ' +
      'matches obscure Grade-5 tags. Neither tier is changed by our proposal — this ' +
      'should remain a defensible "slight" after the fixes.',
    baskets: [
      ['2-1-057', '2-1-064', '2-1-037'],   // G1 normal-4: Arcanine(leg), Weavile, Cinderace
      ['2-1-025', '2-1-012', '2-1-019'],   // G1 normal-5: Abomasnow, Heracross, Electivire
    ],
    leftLabel: 'Grade-4: Arcanine(leg) + Weavile + Cinderace (pop 7–8)',
    rightLabel: 'Grade-5: Abomasnow + Heracross + Electivire (pop 5–6)',
    isValidation: true,
  },
];

// ── Scoring ────────────────────────────────────────────────────────────────

interface ScoredScenario {
  scenario: Scenario;
  leftTags: RawTag[];
  rightTags: RawTag[];
  beforeLeft: BasketScore;
  beforeRight: BasketScore;
  beforeVerdict: FairnessVerdict;
  afterLeft: BasketScore;
  afterRight: BasketScore;
  afterVerdict: FairnessVerdict;
}

function runScenarios(): ScoredScenario[] {
  return SCENARIOS.map((scenario) => {
    const [lNums, rNums] = scenario.baskets;
    const leftTags = lNums.map(byNum);
    const rightTags = rNums.map(byNum);

    const beforeLeft = scoreBasket(leftTags, popLookup);
    const beforeRight = scoreBasket(rightTags, popLookup);
    const afterLeft = scoreBasketProposed(leftTags);
    const afterRight = scoreBasketProposed(rightTags);

    return {
      scenario,
      leftTags,
      rightTags,
      beforeLeft,
      beforeRight,
      beforeVerdict: judgeFairness(beforeLeft, beforeRight),
      afterLeft,
      afterRight,
      afterVerdict: judgeFairness(afterLeft, afterRight),
    };
  });
}

// ── Render helpers ─────────────────────────────────────────────────────────

function verdictColor(v: string) {
  if (v === 'fair') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (v === 'slight') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-rose-100 text-rose-800 border-rose-300';
}

function verdictLabel(v: string) {
  if (v === 'fair') return '✓ Fair';
  if (v === 'slight') return '⚠ Slight';
  return '✗ Unfair';
}

function BreakdownRow({
  tag,
  bd,
}: {
  tag: RawTag;
  bd: ScoreBreakdown;
}) {
  const { scarcity, popularity, market, mechanic } = bd.components;
  return (
    <tr className="border-t border-slate-200 text-sm">
      <td className="py-1 pr-3 font-medium text-slate-700">{tag.nameEn}</td>
      <td className="py-1 pr-3 text-slate-500 text-xs">{scarcity.tier}</td>
      <td className="py-1 pr-3 text-right tabular-nums">{scarcity.points}</td>
      <td className="py-1 pr-3 text-right tabular-nums text-violet-700">
        {popularity.points}
        <span className="text-slate-400 text-[10px] ml-1">({popularity.popScore})</span>
      </td>
      <td className="py-1 pr-3 text-right tabular-nums text-sky-700">
        {market.points}
        {market.confidence < 1 && (
          <span className="text-slate-400 text-[10px] ml-1">×{market.confidence}</span>
        )}
      </td>
      <td className="py-1 pr-3 text-right tabular-nums text-amber-700">{mechanic.points}</td>
      <td className="py-1 font-bold text-right tabular-nums text-slate-900">{bd.total}</td>
    </tr>
  );
}

function BasketTable({
  label,
  tags,
  basket,
  afterBasket,
}: {
  label: string;
  tags: RawTag[];
  basket: BasketScore;
  afterBasket: BasketScore;
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <table className="w-full">
        <thead>
          <tr className="text-xs text-slate-400 text-right">
            <th className="text-left font-normal pb-1">Tag</th>
            <th className="text-left font-normal pb-1 pr-3">Tier</th>
            <th className="pr-3 pb-1">Scar</th>
            <th className="pr-3 pb-1">Pop</th>
            <th className="pr-3 pb-1">Mkt</th>
            <th className="pr-3 pb-1">Mec</th>
            <th className="pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((t, i) => (
            <BreakdownRow key={t.num + i} tag={t} bd={basket.tags[i]!} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 text-sm font-semibold">
            <td colSpan={6} className="pt-1 text-slate-500">
              Basket total
              {afterBasket.total !== basket.total && (
                <span className="ml-2 text-xs font-normal text-emerald-600">
                  → {afterBasket.total} after
                </span>
              )}
            </td>
            <td className="pt-1 text-right text-slate-900 tabular-nums">{basket.total}</td>
          </tr>
          <tr className="text-xs text-slate-400">
            <td colSpan={7}>
              Market sum: NT${Math.round(basket.medianPriceSum)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function WeightSanityPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const results = runScenarios();

  const currentWeights = [
    { name: 'super-rare', cur: SCARCITY_POINTS['super-rare'], proposed: null },
    { name: 'classic', cur: SCARCITY_POINTS['classic'], proposed: null },
    { name: 'gold-star', cur: SCARCITY_POINTS['gold-star'], proposed: null },
    { name: 'special ★', cur: SCARCITY_POINTS['special'], proposed: 29 },
    { name: 'featured', cur: SCARCITY_POINTS['featured'], proposed: null },
    { name: 'normal-5', cur: SCARCITY_POINTS['normal-5'], proposed: null },
    { name: 'normal-4', cur: SCARCITY_POINTS['normal-4'], proposed: null },
    { name: 'normal-3 ★', cur: SCARCITY_POINTS['normal-3'], proposed: 12 },
    { name: 'normal-2', cur: SCARCITY_POINTS['normal-2'], proposed: null },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 font-sans text-slate-800">
      <h1 className="text-2xl font-bold mb-1">Weight Sanity Check</h1>
      <p className="text-slate-500 text-sm mb-8">
        Pre-M4 calibration — scores real 3-tag baskets from seed data and flags
        verdicts that feel wrong to a parent or child. All changes confined to{' '}
        <code className="bg-slate-100 px-1 rounded">weights.ts</code>.
      </p>

      {/* Current weights table */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-3 text-slate-700">
          Current Scarcity Points (from weights.ts)
        </h2>
        <table className="text-sm border border-slate-200 rounded overflow-hidden">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Tier</th>
              <th className="px-4 py-2 text-right">Current</th>
              <th className="px-4 py-2 text-right">Proposed</th>
              <th className="px-4 py-2 text-left">Δ reason</th>
            </tr>
          </thead>
          <tbody>
            {currentWeights.map((w) => (
              <tr
                key={w.name}
                className={`border-t border-slate-100 ${w.proposed !== null ? 'bg-amber-50' : ''}`}
              >
                <td className="px-4 py-1.5 font-mono text-xs">{w.name}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{w.cur}</td>
                <td className="px-4 py-1.5 text-right tabular-nums font-semibold">
                  {w.proposed !== null ? (
                    <span className="text-emerald-700">
                      {w.proposed}
                      <span className="text-xs font-normal ml-1">
                        (+{w.proposed - w.cur})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-1.5 text-slate-500 text-xs">
                  {w.name === 'normal-3 ★' &&
                    'Closes "beloved-common paradox": 3×Pikachu vs 3×Lokix goes from slight → fair'}
                  {w.name === 'special ★' &&
                    'Event-exclusive tags should outrank standard gold-star pulls (24 < 28 was wrong)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-2">
          No changes to market steps, fairness bands, or grade bands — the ~100 ceiling is preserved.
        </p>
      </section>

      {/* Scenarios */}
      <section>
        <h2 className="text-base font-semibold mb-4 text-slate-700">Scenario Analysis</h2>
        <div className="space-y-10">
          {results.map(
            ({
              scenario,
              leftTags,
              rightTags,
              beforeLeft,
              beforeRight,
              beforeVerdict,
              afterLeft,
              afterRight,
              afterVerdict,
            }) => {
              const verdictChanged = beforeVerdict.verdict !== afterVerdict.verdict;
              return (
                <div
                  key={scenario.id}
                  className={`rounded-xl border p-5 ${
                    scenario.issue && !scenario.isValidation
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <h3 className="font-semibold text-slate-900 mb-1">{scenario.title}</h3>
                  <p className="text-xs text-slate-500 mb-4">{scenario.subtitle}</p>

                  {/* Two baskets side by side */}
                  <div className="flex gap-8 mb-4 overflow-x-auto">
                    <BasketTable
                      label={scenario.leftLabel}
                      tags={leftTags}
                      basket={beforeLeft}
                      afterBasket={afterLeft}
                    />
                    <div className="flex items-center self-center text-slate-300 font-bold text-xl shrink-0">
                      vs
                    </div>
                    <BasketTable
                      label={scenario.rightLabel}
                      tags={rightTags}
                      basket={beforeRight}
                      afterBasket={afterRight}
                    />
                  </div>

                  {/* Verdict row */}
                  <div className="flex flex-wrap items-start gap-4 pt-3 border-t border-slate-200">
                    {/* Before */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Before:</span>
                      <span
                        className={`border rounded px-2 py-0.5 text-xs font-semibold ${verdictColor(beforeVerdict.verdict)}`}
                      >
                        {verdictLabel(beforeVerdict.verdict)}
                      </span>
                      <span className="text-xs text-slate-500">
                        diff {beforeVerdict.diff}pts ({beforeVerdict.pctDiff.toFixed(1)}%),{' '}
                        {beforeVerdict.richerSide !== 'none'
                          ? `${beforeVerdict.richerSide} richer`
                          : 'tied'}
                      </span>
                    </div>

                    {/* After */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">After proposed:</span>
                      <span
                        className={`border rounded px-2 py-0.5 text-xs font-semibold ${verdictColor(afterVerdict.verdict)}`}
                      >
                        {verdictLabel(afterVerdict.verdict)}
                      </span>
                      <span className="text-xs text-slate-500">
                        diff {afterVerdict.diff}pts ({afterVerdict.pctDiff.toFixed(1)}%)
                      </span>
                      {verdictChanged && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          ✓ verdict changes
                        </span>
                      )}
                    </div>

                    {/* Cash anchor (scenario 4) */}
                    {beforeVerdict.priceGap > 0 && (
                      <div className="text-xs text-slate-500 ml-auto">
                        Cash anchor: NT${Math.round(beforeVerdict.priceGap)} gap —{' '}
                        <span className="font-medium">{beforeVerdict.payingSide}</span> side pays
                      </div>
                    )}
                  </div>

                  {/* Issue callout */}
                  {scenario.issue && (
                    <div className="mt-3 text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded p-2">
                      ⚠ {scenario.issue}
                    </div>
                  )}
                  {scenario.isValidation && (
                    <div className="mt-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">
                      ✓ Validation scenario — verdict should remain{' '}
                      <strong>{beforeVerdict.verdict}</strong> after proposed changes.
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* Summary table */}
      <section className="mt-12">
        <h2 className="text-base font-semibold mb-3 text-slate-700">
          Verdict Summary — Before vs After
        </h2>
        <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Scenario</th>
              <th className="px-4 py-2 text-center">Before</th>
              <th className="px-4 py-2 text-center">After</th>
              <th className="px-4 py-2 text-center">Δ</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ scenario, beforeVerdict, afterVerdict }) => {
              const changed = beforeVerdict.verdict !== afterVerdict.verdict;
              return (
                <tr key={scenario.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-xs">{scenario.title.replace(/^\d+\.\s/, '')}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`border rounded px-2 py-0.5 text-xs font-semibold ${verdictColor(beforeVerdict.verdict)}`}
                    >
                      {verdictLabel(beforeVerdict.verdict)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`border rounded px-2 py-0.5 text-xs font-semibold ${verdictColor(afterVerdict.verdict)}`}
                    >
                      {verdictLabel(afterVerdict.verdict)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-xs">
                    {changed ? (
                      <span className="text-emerald-700 font-bold">
                        {beforeVerdict.verdict} → {afterVerdict.verdict}
                      </span>
                    ) : (
                      <span className="text-slate-400">unchanged</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Rationale section */}
      <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-base font-semibold mb-3 text-slate-700">
          Proposed Changes — Rationale
        </h2>
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-mono text-xs bg-white border border-slate-200 rounded px-2 py-1 mb-1 inline-block">
              SCARCITY_POINTS[&apos;normal-3&apos;]: 8 → 12
            </p>
            <p className="text-slate-600">
              <strong>Problem:</strong> With the current weights, three beloved Grade-3 tags (Pikachu
              pop 9) score 102 against three obscure Grade-5 tags (Lokix pop 4) scoring 120 —{' '}
              <em>slight</em> verdict, right side richer by 15%. The popularity axis grants +13 pts
              to Pikachu over Lokix but scarcity only gives Lokix +12; the residual market gap
              (NT$280 vs NT$70 → 10 vs 3 pts) keeps the obscure side ahead.
            </p>
            <p className="text-slate-600 mt-1">
              <strong>Fix:</strong> Raising normal-3 to 12 (+4) means the beloved-vs-obscure
              scarcity gap narrows from 12 to 8 pts, enough for the popularity advantage to
              prevail. Three Pikachus (114) vs three Lokixes (120): diff 6 pts, 5.3% —{' '}
              <em>fair</em> under the soft rule (diff ≤ 10 <em>and</em> pct ≤ 8%).
            </p>
            <p className="text-slate-600 mt-1">
              <strong>No regressions:</strong> All §7.3 spec-pinned scores (Mewtwo 93, Arceus 87)
              use super-rare tier — unaffected. Grade-band and fairness-band tests use synthetic
              inputs — unaffected.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs bg-white border border-slate-200 rounded px-2 py-1 mb-1 inline-block">
              SCARCITY_POINTS[&apos;special&apos;]: 24 → 29
            </p>
            <p className="text-slate-600">
              <strong>Problem:</strong> Event-exclusive tags (obtainable only at physical Mezastar
              events) have <code>gradeTier: &apos;special&apos;</code> scoring 24 scarcity points — four
              points <em>below</em> a standard gold-star grade-5 tag (28). A child who attended
              an event to get a special Lucario tag reasonably expects it to outrank a tag you
              can pull from any regular pack.
            </p>
            <p className="text-slate-600 mt-1">
              <strong>Fix:</strong> Raising special to 29 places it one point above gold-star (28)
              and well below classic (36). Each SP event tag gains 5 scarcity points. The SP event
              basket (Lucario + Mimikyu + Dragonite) improves from 158 to 173, closing the gap
              against the G1 gold-star set from 35 pts → 20 pts while keeping the verdict{' '}
              <em>slight</em> (the gold-star set is still legitimately harder to score).
            </p>
          </div>
          <div className="text-xs text-slate-500 border-t border-slate-200 pt-3 mt-2">
            <strong>Ceiling check:</strong> Best possible score with proposed weights:{' '}
            super-rare (40) + pop 10 (25) + market ≥1800 (18) + mechanic cap (17) = 100 ✓
            <br />
            <strong>Market steps unchanged</strong> — removing the 250→10 market-step change
            (considered then rejected) avoids a regression in scenario 4 where the featured-icon
            basket would have flipped from <em>slight</em> to <em>unfair</em>.
          </div>
        </div>
      </section>

      <footer className="mt-8 text-xs text-slate-400 border-t border-slate-200 pt-4">
        Dev tool — rendered server-side, not shipped to production. All scores via the live
        scoring engine (
        <code>src/lib/scoring/score.ts</code>) with real pack data.
      </footer>
    </main>
  );
}
