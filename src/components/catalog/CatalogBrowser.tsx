'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import type { PackMeta, ScoredTag } from '@/data/catalog';
import type { PokemonType } from '@/data/schema';
import { useRouter } from '@/i18n/navigation';
import {
  buildCatalogHref,
  catalogScrollStorageKey,
  hasActiveCatalogFilters,
  parseCatalogFilters,
  SPECIAL_GRADE_FILTER,
  type CatalogFilters,
} from '@/lib/catalog-filters';
import { ALL_TYPES } from '@/lib/pokemon-types';

import { TagCard } from './TagCard';

const CATALOG_PATH = '/catalog';
const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  entries: ScoredTag[];
  packs: PackMeta[];
  locale: string;
}

function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim();
}

function saveCatalogScroll(scrollKey: string): void {
  try {
    sessionStorage.setItem(scrollKey, String(window.scrollY));
  } catch {
    // sessionStorage unavailable (private mode, quota, etc.)
  }
}

function readAndClearScroll(scrollKey: string): number | null {
  try {
    const raw = sessionStorage.getItem(scrollKey);
    if (raw === null) return null;
    sessionStorage.removeItem(scrollKey);
    const y = Number.parseInt(raw, 10);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

export function CatalogBrowser({ entries, packs, locale }: Props) {
  const t = useTranslations('catalog');
  const tTypes = useTranslations('types');
  const tTier = useTranslations('gradeTier');
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(
    () => parseCatalogFilters(searchParams),
    [searchParams],
  );

  const [queryDraft, setQueryDraft] = useState(filters.q);
  const scrollRestoredRef = useRef(false);
  /** undefined = not read yet; null = no saved position for this key. */
  const savedScrollRef = useRef<number | null | undefined>(undefined);

  const replaceFilters = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const current = parseCatalogFilters(searchParams);
      router.replace(buildCatalogHref({ ...current, ...patch }));
    },
    [router, searchParams],
  );

  // Keep the search input in sync when the URL changes (back/forward, clear, locale swap).
  useEffect(() => {
    setQueryDraft(filters.q);
  }, [filters.q]);

  // Debounce search → URL (replace, not push).
  useEffect(() => {
    const trimmedDraft = queryDraft.trim();
    if (trimmedDraft === filters.q.trim()) return;

    const handle = window.setTimeout(() => {
      replaceFilters({ q: queryDraft });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [queryDraft, filters.q, replaceFilters]);

  const scrollKey = catalogScrollStorageKey(CATALOG_PATH, queryString);

  // Save scroll when leaving the catalog (e.g. into a tag detail route).
  useEffect(() => {
    return () => {
      saveCatalogScroll(scrollKey);
    };
  }, [scrollKey]);

  const grades = useMemo(
    () => [...new Set(entries.map((e) => e.tag.grade))].sort((a, b) => b - a),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = normalize(filters.q);
    return entries.filter(({ tag }) => {
      if (filters.pack && tag.pack !== filters.pack) return false;
      if (filters.grade === SPECIAL_GRADE_FILTER) {
        // The Special bucket: event tags only (synthetic grade 5, gradeTier 'special').
        if (tag.gradeTier !== 'special') return false;
      } else if (filters.grade !== '') {
        // A numeric grade bucket excludes Special tags so ★5 stays clean.
        if (tag.grade !== Number(filters.grade) || tag.gradeTier === 'special') return false;
      }
      if (filters.type && !tag.types.includes(filters.type as PokemonType)) return false;
      if (q) {
        const hay = `${normalize(tag.nameEn)} ${normalize(tag.nameZh)} ${normalize(tag.num)}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filters]);

  const grouped = useMemo(
    () =>
      packs
        .map((meta) => ({
          meta,
          tags: filtered.filter((e) => e.tag.pack === meta.pack),
        }))
        .filter((g) => g.tags.length > 0),
    [packs, filtered],
  );

  const hasFilters = hasActiveCatalogFilters(filters);

  // Reset scroll-restore bookkeeping when the catalog URL identity changes.
  useEffect(() => {
    scrollRestoredRef.current = false;
    savedScrollRef.current = undefined;
  }, [scrollKey]);

  // Restore scroll after the filtered list has rendered (clamp if filters shrank the page).
  useLayoutEffect(() => {
    if (scrollRestoredRef.current) return;

    if (savedScrollRef.current === undefined) {
      savedScrollRef.current = readAndClearScroll(scrollKey);
    }
    const savedY = savedScrollRef.current;
    if (savedY === null) return;

    const applyScroll = (): void => {
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      window.scrollTo(0, Math.min(Math.max(0, savedY), maxScroll));
      scrollRestoredRef.current = true;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(applyScroll);
    });
  }, [scrollKey, grouped.length, filtered.length]);

  function clear(): void {
    setQueryDraft('');
    router.replace(CATALOG_PATH);
  }

  return (
    <div>
      <form
        className="mb-8 grid gap-4 rounded-xl border border-vault-hairline p-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ backgroundColor: 'var(--panel-fill)' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
          <label htmlFor="catalog-search" className="text-sm font-medium text-vault-text">
            {t('searchLabel')}
          </label>
          <input
            id="catalog-search"
            type="search"
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="min-h-11 rounded-lg border border-vault-hairline bg-vault-bg px-3 text-base text-vault-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-pack" className="text-sm font-medium text-vault-text">
            {t('filterPack')}
          </label>
          <select
            id="filter-pack"
            value={filters.pack}
            onChange={(e) => replaceFilters({ pack: e.target.value })}
            className="min-h-11 rounded-lg border border-vault-hairline bg-vault-bg px-3 text-base text-vault-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          >
            <option value="">{t('allPacks')}</option>
            {packs.map((p) => (
              <option key={p.pack} value={p.pack}>
                {locale === 'zh-TW' ? p.name.zh : p.name.en}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-grade" className="text-sm font-medium text-vault-text">
            {t('filterGrade')}
          </label>
          <select
            id="filter-grade"
            value={filters.grade}
            onChange={(e) => replaceFilters({ grade: e.target.value })}
            className="min-h-11 rounded-lg border border-vault-hairline bg-vault-bg px-3 text-base text-vault-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          >
            <option value="">{t('allGrades')}</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {t('gradeOption', { grade: g })}
              </option>
            ))}
            <option value={SPECIAL_GRADE_FILTER}>{tTier('special')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-type" className="text-sm font-medium text-vault-text">
            {t('filterType')}
          </label>
          <select
            id="filter-type"
            value={filters.type}
            onChange={(e) => replaceFilters({ type: e.target.value })}
            className="min-h-11 rounded-lg border border-vault-hairline bg-vault-bg px-3 text-base text-vault-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          >
            <option value="">{t('allTypes')}</option>
            {ALL_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {tTypes(ty)}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-vault-muted" aria-live="polite">
          {t('results', { count: filtered.length })}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clear}
            className="min-h-11 rounded-lg border border-vault-hairline px-3 text-sm font-medium text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-xl border border-dashed border-vault-hairline p-8 text-center text-vault-muted">
          {t('noResults')}
        </p>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ meta, tags }) => (
            <section key={meta.pack} aria-labelledby={`pack-${meta.pack}`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-vault-hairline pb-2">
                <h2 id={`pack-${meta.pack}`} className="font-display text-lg font-bold text-vault-text">
                  {locale === 'zh-TW' ? meta.name.zh : meta.name.en}
                </h2>
                <span className="font-mono text-sm text-vault-muted">
                  {t('migratedOf', { migrated: meta.migratedCount, official: meta.officialTotal })}
                  {meta.current && <span className="ml-2 text-status-owned">· {t('current')}</span>}
                </span>
              </div>
              {/* Horizontal cards: 1 across on portrait/mobile, 2 on iPad landscape+. */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {tags.map((entry) => (
                  <TagCard key={entry.tag.tagId} entry={entry} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
