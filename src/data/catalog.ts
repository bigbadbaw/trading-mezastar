/**
 * Catalog read accessor — the SINGLE boundary between (data + scoring engine)
 * and the UI (M3).
 *
 * Responsibilities:
 *   - Load the 6 migrated pack JSONs and validate each with `PackSchema.parse`
 *     at this boundary (Zod-at-every-boundary; the raw JSONs are otherwise
 *     trusted blindly).
 *   - Build the injected `PopularityLookup` from popularity.json and feed it to
 *     the pure engine's `scoreTag`. The engine imports nothing from here; the
 *     dependency direction stays data -> engine.
 *   - Score every tag ONCE per process (module-level memoization) so catalog and
 *     detail pages never re-score 374 tags per request.
 *
 * UI code imports ONLY from this module (data + the re-exported types); it must
 * never reach into `src/lib/scoring/*` or `popularity.json` directly.
 */

import g1 from '@/data/packs/g1.json';
import s1 from '@/data/packs/s1.json';
import s2 from '@/data/packs/s2.json';
import s3 from '@/data/packs/s3.json';
import s4 from '@/data/packs/s4.json';
import sp from '@/data/packs/sp.json';
import popularity from '@/data/popularity.json';
import { PackSchema, type Pack, type Tag } from '@/data/schema';
import { scoreTag } from '@/lib/scoring/score';
import type {
  PopularityLookup,
  PopularitySource,
  ScoreBreakdown,
} from '@/lib/scoring/types';

/** Re-exported so the UI can type score breakdowns without importing the engine. */
export type { ScoreBreakdown } from '@/lib/scoring/types';
export type { Tag } from '@/data/schema';

/** Pack-level metadata for grouping and honest completion indicators. */
export interface PackMeta {
  pack: Pack['pack'];
  name: { zh: string; en: string };
  current: boolean;
  /** Official tag count per mezastar.com. */
  officialTotal: number;
  /** How many tags are actually migrated (sp is a 3-of-50 stub). */
  migratedCount: number;
}

/** A single tag joined to its pack metadata and its transparent score. */
export interface ScoredTag {
  tag: Tag;
  pack: PackMeta;
  score: ScoreBreakdown;
}

// ---- Popularity lookup (built once, injected into the pure engine) ---------

interface PopularityRow {
  score: number;
  source: string;
}
const POP_MAP = popularity as Record<string, PopularityRow | undefined>;

const popLookup: PopularityLookup = (species) => {
  const row = POP_MAP[species];
  return row ? { score: row.score, source: row.source as PopularitySource } : undefined;
};

// ---- Validation + scoring (memoized) ---------------------------------------

const RAW_PACKS: readonly unknown[] = [g1, s1, s2, s3, s4, sp];

function buildPackMeta(pack: Pack): PackMeta {
  return {
    pack: pack.pack,
    name: { zh: pack.packName.zh, en: pack.packName.en },
    current: pack.current,
    officialTotal: pack.officialTotal,
    migratedCount: pack.tags.length,
  };
}

interface Catalog {
  scored: ScoredTag[];
  packs: PackMeta[];
  byId: Map<string, ScoredTag>;
}

let cache: Catalog | undefined;

function build(): Catalog {
  const scored: ScoredTag[] = [];
  const packs: PackMeta[] = [];
  const byId = new Map<string, ScoredTag>();

  for (const raw of RAW_PACKS) {
    // Validate at the boundary — throws loudly on any schema drift.
    const pack = PackSchema.parse(raw);
    const meta = buildPackMeta(pack);
    packs.push(meta);

    for (const tag of pack.tags) {
      const entry: ScoredTag = { tag, pack: meta, score: scoreTag(tag, popLookup) };
      scored.push(entry);
      byId.set(tag.tagId, entry);
    }
  }

  return { scored, packs, byId };
}

function catalog(): Catalog {
  if (!cache) cache = build();
  return cache;
}

// ---- Public accessor surface -----------------------------------------------

/** All migrated tags, packs Zod-validated and each tag scored. */
export function getScoredCatalog(): ScoredTag[] {
  return catalog().scored;
}

/** Pack metadata (order matches the pack JSON load order). */
export function getCatalogPacks(): PackMeta[] {
  return catalog().packs;
}

/** Look up one scored tag by its stable `tagId`. */
export function getScoredTag(tagId: string): ScoredTag | undefined {
  return catalog().byId.get(tagId);
}
