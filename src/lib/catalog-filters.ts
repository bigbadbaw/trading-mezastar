/**
 * Catalog filter state synced to /catalog query params (shareable, back-nav safe).
 * Pure parse/serialize helpers — unit-testable without jsdom.
 */

import { PACK_CODES, POKEMON_TYPES, type PokemonType } from '@/data/schema';

export interface CatalogFilters {
  pack: string;
  grade: string;
  type: string;
  q: string;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  pack: '',
  grade: '',
  type: '',
  q: '',
};

const PACK_SET = new Set<string>(PACK_CODES);
const TYPE_SET = new Set<string>(POKEMON_TYPES);

function isPackCode(value: string): boolean {
  return PACK_SET.has(value);
}

/** The non-numeric grade sentinel: Special/event tags (gradeTier === 'special'),
 *  which carry a synthetic grade 5 but must not fold into the ★5 bucket. */
export const SPECIAL_GRADE_FILTER = 'special';

function isGradeFilter(value: string): boolean {
  if (value === SPECIAL_GRADE_FILTER) return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 6;
}

function isPokemonType(value: string): value is PokemonType {
  return TYPE_SET.has(value);
}

/** Read catalog filters from URL search params; unknown values fall back to default. */
export function parseCatalogFilters(searchParams: URLSearchParams): CatalogFilters {
  const packRaw = searchParams.get('pack') ?? '';
  const gradeRaw = searchParams.get('grade') ?? '';
  const typeRaw = searchParams.get('type') ?? '';
  const qRaw = searchParams.get('q') ?? '';

  return {
    pack: isPackCode(packRaw) ? packRaw : '',
    grade: isGradeFilter(gradeRaw) ? gradeRaw : '',
    type: isPokemonType(typeRaw) ? typeRaw : '',
    q: qRaw,
  };
}

/** Serialize filters; omit params at their default so clean URLs stay clean. */
export function serializeCatalogFilters(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.pack) params.set('pack', filters.pack);
  if (filters.grade) params.set('grade', filters.grade);
  if (filters.type) params.set('type', filters.type);
  const q = filters.q.trim();
  if (q) params.set('q', q);
  return params;
}

export function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return Boolean(filters.pack || filters.grade || filters.type || filters.q.trim());
}

/** Build a locale-agnostic catalog href for next-intl router.replace. */
export function buildCatalogHref(filters: CatalogFilters): string {
  const qs = serializeCatalogFilters(filters).toString();
  return qs ? `/catalog?${qs}` : '/catalog';
}

/** sessionStorage key for ephemeral scroll restore keyed by catalog path + query. */
export function catalogScrollStorageKey(pathname: string, queryString: string): string {
  return `catalog-scroll:${pathname}${queryString ? `?${queryString}` : ''}`;
}
