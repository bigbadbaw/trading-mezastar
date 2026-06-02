/**
 * M1 — one-shot migration of Rachel's prototype seed into typed, Zod-validated
 * per-pack JSON. Run with `pnpm migrate`. This is the ONLY place the raw seed's
 * prototype field names (star/atk/rarity/name/enName/label) and the note-text
 * pattern matching live; everything downstream reads structured fields.
 *
 * Outputs:
 *   src/data/packs/{g1,s1,s2,s3,s4,sp}.json   (validated Pack objects)
 *   src/data/migration-report.json            (human-review summary)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import rawSeed from '../docs/seed-data/seed-tags.raw.json';
import popularity from '../src/data/popularity.json';
import { deriveSpecies } from '../src/lib/species-map';
import { PackSchema, type Pack, type Tag } from '../src/data/schema';
import {
  MECHANIC_FLAGS,
  type Mechanics,
  type MechanicFlag,
} from '../src/lib/scoring/types';

// ---- Raw seed shape (prototype terminology) -------------------------------

interface RawCard {
  num: string;
  name: string;
  enName: string;
  emoji: string;
  types: string[];
  star: number;
  atk: number;
  rarity: string;
  label?: string; // absent on ~298 (non-g1) tags in the seed
  price: number[];
  note: string;
  unconfirmed?: boolean;
}
interface RawPack {
  pack: string;
  packName: { zh: string; en: string };
  packDate: string;
  current: boolean;
  officialTotal: number;
  cards: RawCard[];
}

const seed = rawSeed as unknown as RawPack[];
const POP_KEYS = new Set(Object.keys(popularity));
const REGULAR_NUM = /^\d+-\d+-\d+$/;
const UNCONFIRMED_PRICE_CONFIDENCE = 0.6;

// ---- Mechanics derivation (M2-spec §2d, run ONCE here) --------------------

function deriveMechanics(
  note: string,
  enName: string,
  gradeTier: string,
  energy: number,
): Mechanics {
  const hay = `${note} ${enName}`;
  const has = (...subs: string[]) => subs.some((s) => hay.includes(s));
  return {
    gigantamax: /G-?Max|Gigantamax/i.test(hay) || has('極巨化', '超極巨化'),
    mega: /\bMega\b/i.test(hay) || has('超級進化') || enName.startsWith('Mega '),
    rareSlot: /rare-?slot/i.test(hay) || has('稀有位', '越級限量'),
    zMove: /Z-?move/i.test(hay) || has('Z招式'),
    legendary:
      /legendary|Paradox/i.test(hay) || has('傳說', '神獸', '幻之', '究極異獸'),
    classic: gradeTier === 'classic',
    highAtk: energy >= 170,
  };
}

// ---- Report accumulators --------------------------------------------------

interface Ref {
  pack: string;
  num: string;
  enName: string;
}
const report = {
  generatedFromTags: 0,
  byPack: {} as Record<string, { migrated: number; officialTotal: number }>,
  dualTagsSplit: [] as (Ref & { species: string[] })[],
  speciesNeedingReview: [] as (Ref & { species: string[]; reason: string })[],
  unconfirmedTags: [] as Ref[],
  irregularNums: [] as Ref[],
  spPackGap: null as null | {
    pack: string;
    migrated: number;
    officialTotal: number;
    missing: number;
  },
  mechanicTallies: Object.fromEntries(
    MECHANIC_FLAGS.map((f) => [f, 0]),
  ) as Record<MechanicFlag, number>,
  notes: [
    'PRIMARY KEY: `num` is NOT globally unique — reprints (R-/K- prefixes) repeat ' +
      'across packs. The unique key is the (pack, num) pair. Resolve the catalog/DB ' +
      'key scheme before M5 (collection_items.tag_num).',
  ] as string[],
};

// ---- Transform ------------------------------------------------------------

const PACKS_DIR = join(process.cwd(), 'src', 'data', 'packs');
mkdirSync(PACKS_DIR, { recursive: true });

for (const rp of seed) {
  const tags: Tag[] = [];

  for (const c of rp.cards) {
    const ref: Ref = { pack: rp.pack, num: c.num, enName: c.enName };
    const species = deriveSpecies(c.enName);
    const mechanics = deriveMechanics(c.note, c.enName, c.rarity, c.atk);
    for (const f of MECHANIC_FLAGS) if (mechanics[f]) report.mechanicTallies[f]++;

    // Species review: dual-tag, or any species missing from the popularity map.
    if (species.length > 1) {
      report.dualTagsSplit.push({ ...ref, species });
    }
    const orphans = species.filter((s) => !POP_KEYS.has(s));
    if (species.length > 1 || orphans.length > 0) {
      report.speciesNeedingReview.push({
        ...ref,
        species,
        reason:
          species.length > 1
            ? `dual-tag -> ${species.length} species${orphans.length ? `; missing from popularity: ${orphans.join(', ')}` : ''}`
            : `species missing from popularity: ${orphans.join(', ')}`,
      });
    }

    if (c.unconfirmed === true) report.unconfirmedTags.push(ref);
    if (!REGULAR_NUM.test(c.num)) report.irregularNums.push(ref);

    const low = c.price[0];
    const high = c.price[1];
    if (typeof low !== 'number' || typeof high !== 'number') {
      throw new Error(`${rp.pack}/${c.num}: malformed price ${JSON.stringify(c.price)}`);
    }

    tags.push({
      num: c.num,
      pack: rp.pack as Tag['pack'],
      nameZh: c.name,
      nameEn: c.enName,
      emoji: c.emoji,
      labelZh: c.label ?? '', // ~298 tags (non-g1) carry no label in the seed
      types: c.types as Tag['types'],
      grade: c.star,
      energy: c.atk,
      gradeTier: c.rarity as Tag['gradeTier'],
      price: [low, high],
      priceConfidence: c.unconfirmed === true ? UNCONFIRMED_PRICE_CONFIDENCE : 1.0,
      species,
      mechanics,
      note: c.note,
      unconfirmed: c.unconfirmed === true,
    });
  }

  // Validate the whole pack (throws loudly on any schema violation).
  const pack: Pack = PackSchema.parse({
    pack: rp.pack,
    packName: rp.packName,
    packDate: rp.packDate,
    current: rp.current,
    officialTotal: rp.officialTotal,
    tags,
  });

  report.generatedFromTags += tags.length;
  report.byPack[rp.pack] = {
    migrated: tags.length,
    officialTotal: rp.officialTotal,
  };
  if (rp.pack === 'sp' && tags.length < rp.officialTotal) {
    report.spPackGap = {
      pack: 'sp',
      migrated: tags.length,
      officialTotal: rp.officialTotal,
      missing: rp.officialTotal - tags.length,
    };
  }

  writeFileSync(
    join(PACKS_DIR, `${rp.pack}.json`),
    JSON.stringify(pack, null, 2) + '\n',
    'utf8',
  );
}

writeFileSync(
  join(process.cwd(), 'src', 'data', 'migration-report.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8',
);

console.log(
  `Migrated ${report.generatedFromTags} tags across ${seed.length} packs.\n` +
    `  dual-tags split:        ${report.dualTagsSplit.length}\n` +
    `  species needing review: ${report.speciesNeedingReview.length}\n` +
    `  unconfirmed tags:       ${report.unconfirmedTags.length}\n` +
    `  irregular nums:         ${report.irregularNums.length}\n` +
    `  sp-pack gap:            ${report.spPackGap ? report.spPackGap.missing + ' missing' : 'none'}\n` +
    `  mechanic tallies:       ${JSON.stringify(report.mechanicTallies)}`,
);
