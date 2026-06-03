/**
 * Presentation metadata for Pokémon types and score grade-letters.
 *
 * Colors live here in code (per M3 spec) as FULL Tailwind utility-class strings
 * so Tailwind's content scanner keeps them — never build class names by string
 * interpolation, and never use inline `style`. Type *labels* are i18n messages
 * (see `types.*` in messages/), not here.
 */

import { POKEMON_TYPES, type PokemonType } from '@/data/schema';

/** Badge classes per type. Backgrounds paired with text colors for >=4.5:1 contrast. */
export const TYPE_BADGE_CLASS: Record<PokemonType, string> = {
  normal: 'bg-stone-400 text-stone-950',
  fire: 'bg-orange-500 text-white',
  water: 'bg-blue-500 text-white',
  electric: 'bg-yellow-400 text-yellow-950',
  grass: 'bg-green-600 text-white',
  ice: 'bg-cyan-300 text-cyan-950',
  fighting: 'bg-red-700 text-white',
  poison: 'bg-purple-600 text-white',
  ground: 'bg-amber-600 text-white',
  flying: 'bg-indigo-400 text-indigo-950',
  psychic: 'bg-pink-500 text-white',
  bug: 'bg-lime-600 text-white',
  rock: 'bg-yellow-700 text-white',
  ghost: 'bg-violet-700 text-white',
  dragon: 'bg-indigo-700 text-white',
  dark: 'bg-neutral-700 text-white',
  steel: 'bg-slate-500 text-white',
  fairy: 'bg-pink-300 text-pink-950',
};

/** The 18 types in canonical order — re-exported for filter controls. */
export const ALL_TYPES: readonly PokemonType[] = POKEMON_TYPES;

/** Badge classes per score grade-letter (S..F). Fallback covers any stray grade. */
export const GRADE_BADGE_CLASS: Record<string, string> = {
  S: 'bg-amber-500 text-white',
  A: 'bg-red-500 text-white',
  B: 'bg-violet-500 text-white',
  C: 'bg-blue-500 text-white',
  D: 'bg-emerald-500 text-white',
  F: 'bg-gray-500 text-white',
};

export function gradeBadgeClass(grade: string): string {
  return GRADE_BADGE_CLASS[grade] ?? 'bg-gray-500 text-white';
}

export function typeBadgeClass(type: PokemonType): string {
  return TYPE_BADGE_CLASS[type];
}
