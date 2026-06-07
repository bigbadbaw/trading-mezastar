import { describe, expect, it } from 'vitest';

import {
  buildCatalogHref,
  catalogScrollStorageKey,
  EMPTY_CATALOG_FILTERS,
  hasActiveCatalogFilters,
  parseCatalogFilters,
  serializeCatalogFilters,
} from './catalog-filters';

describe('parseCatalogFilters', () => {
  it('returns empty defaults when params are absent', () => {
    expect(parseCatalogFilters(new URLSearchParams())).toEqual(EMPTY_CATALOG_FILTERS);
  });

  it('reads valid pack, grade, type, and q', () => {
    const params = new URLSearchParams('pack=g1&grade=6&type=water&q=pika');
    expect(parseCatalogFilters(params)).toEqual({
      pack: 'g1',
      grade: '6',
      type: 'water',
      q: 'pika',
    });
  });

  it('drops unknown pack, grade, and type values', () => {
    const params = new URLSearchParams('pack=xx&grade=9&type=cosmic&q=foo');
    expect(parseCatalogFilters(params)).toEqual({
      pack: '',
      grade: '',
      type: '',
      q: 'foo',
    });
  });
});

describe('serializeCatalogFilters', () => {
  it('omits default-empty params for a clean URL', () => {
    expect(serializeCatalogFilters(EMPTY_CATALOG_FILTERS).toString()).toBe('');
    expect(buildCatalogHref(EMPTY_CATALOG_FILTERS)).toBe('/catalog');
  });

  it('round-trips through parse', () => {
    const original = new URLSearchParams('pack=s2&grade=5&type=fire&q=mew');
    const filters = parseCatalogFilters(original);
    expect(serializeCatalogFilters(filters).toString()).toBe(original.toString());
  });
});

describe('hasActiveCatalogFilters', () => {
  it('is false for defaults and true when any field is set', () => {
    expect(hasActiveCatalogFilters(EMPTY_CATALOG_FILTERS)).toBe(false);
    expect(hasActiveCatalogFilters({ ...EMPTY_CATALOG_FILTERS, q: 'a' })).toBe(true);
  });
});

describe('catalogScrollStorageKey', () => {
  it('keys scroll by pathname and query string', () => {
    expect(catalogScrollStorageKey('/catalog', 'pack=g1')).toBe(
      'catalog-scroll:/catalog?pack=g1',
    );
    expect(catalogScrollStorageKey('/catalog', '')).toBe('catalog-scroll:/catalog');
  });
});
