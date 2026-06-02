/**
 * Catalog data schema (read-only static catalog domain).
 *
 * One Zod schema, with TS types inferred from it. The `gradeTier` and
 * `mechanics` shapes are imported from the scoring engine's domain contract
 * (src/lib/scoring/types.ts) so the catalog and the engine cannot drift apart.
 * Pokémon `type` is catalog-specific and owned here.
 */

import { z } from 'zod';
import { GRADE_TIERS, MECHANIC_FLAGS } from '@/lib/scoring/types';

/** The 18 Pokémon types present in the v1 seed. */
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

/** Pack codes in the v1 seed. */
export const PACK_CODES = ['g1', 's1', 's2', 's3', 's4', 'sp'] as const;

export const PokemonTypeEnum = z.enum(POKEMON_TYPES);
export const GradeTierEnum = z.enum(GRADE_TIERS);
export const PackEnum = z.enum(PACK_CODES);

export const MechanicsSchema = z.object(
  Object.fromEntries(MECHANIC_FLAGS.map((f) => [f, z.boolean()])) as Record<
    (typeof MECHANIC_FLAGS)[number],
    z.ZodBoolean
  >,
);

/**
 * A single migrated tag. Domain terminology applied (grade/energy/gradeTier);
 * the raw seed's prototype field names (star/atk/rarity/name/enName/label) exist
 * only inside the migration script.
 */
export const TagSchema = z.object({
  /** Collection number. Natural key WITHIN a pack; NOT globally unique
   *  (reprints like R-1-1 repeat across packs). Global key is pack + num. */
  num: z.string().min(1),
  /** Pack this tag belongs to — needed for the composite key once packs merge. */
  pack: PackEnum,
  nameZh: z.string().min(1), // was `name`
  nameEn: z.string().min(1), // was `enName`
  emoji: z.string().min(1),
  labelZh: z.string(), // was `label` (zh-only display text)
  types: z.array(PokemonTypeEnum).min(1).max(2),
  grade: z.number().int().min(1).max(6), // was `star`
  energy: z.number().int().nonnegative(), // was `atk`
  gradeTier: GradeTierEnum, // was `rarity`
  /** NT$ [low, high]. */
  price: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
  /** 1.0 confirmed, 0.6 when `unconfirmed` (M2-spec §3c). */
  priceConfidence: z.number().min(0).max(1),
  /** Base species for the popularity join; length 2 for the dual-tag. */
  species: z.array(z.string().min(1)).min(1).max(2),
  /** Structured special-mechanic flags, derived once from note + nameEn. */
  mechanics: MechanicsSchema,
  /** Raw flavor text, kept for reference. NEVER parsed at scoring time. */
  note: z.string(),
  /** Whether the tag's data is verified against mezastar.com. */
  unconfirmed: z.boolean(),
});

/** A migrated pack file: metadata + its tags. */
export const PackSchema = z.object({
  pack: PackEnum,
  packName: z.object({ zh: z.string(), en: z.string() }),
  packDate: z.string(),
  current: z.boolean(),
  /** Official tag count per mezastar.com; tags.length may be smaller if a pack
   *  is only partially migrated (e.g. the `sp` 3-of-50 stub). */
  officialTotal: z.number().int().positive(),
  tags: z.array(TagSchema),
});

export type Tag = z.infer<typeof TagSchema>;
export type Pack = z.infer<typeof PackSchema>;
export type PokemonType = z.infer<typeof PokemonTypeEnum>;
