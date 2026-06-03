'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { PackMeta, ScoredTag } from '@/data/catalog';
import type { PokemonType } from '@/data/schema';
import { ALL_TYPES } from '@/lib/pokemon-types';

import { TagCard } from './TagCard';

interface Props {
  entries: ScoredTag[];
  packs: PackMeta[];
  locale: string;
}

function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim();
}

export function CatalogBrowser({ entries, packs, locale }: Props) {
  const t = useTranslations('catalog');
  const tTier = useTranslations('gradeTier');
  const tTypes = useTranslations('types');

  const [query, setQuery] = useState('');
  const [pack, setPack] = useState('');
  const [grade, setGrade] = useState('');
  const [type, setType] = useState('');

  const grades = useMemo(
    () => [...new Set(entries.map((e) => e.tag.grade))].sort((a, b) => b - a),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    const gradeNum = grade === '' ? null : Number(grade);
    return entries.filter(({ tag }) => {
      if (pack && tag.pack !== pack) return false;
      if (gradeNum !== null && tag.grade !== gradeNum) return false;
      if (type && !tag.types.includes(type as PokemonType)) return false;
      if (q) {
        const hay = `${normalize(tag.nameEn)} ${normalize(tag.nameZh)} ${normalize(tag.num)}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, pack, grade, type]);

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

  const hasFilters = query !== '' || pack !== '' || grade !== '' || type !== '';

  function clear() {
    setQuery('');
    setPack('');
    setGrade('');
    setType('');
  }

  return (
    <div>
      <form
        className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
          <label htmlFor="catalog-search" className="text-sm font-medium text-slate-700">
            {t('searchLabel')}
          </label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-pack" className="text-sm font-medium text-slate-700">
            {t('filterPack')}
          </label>
          <select
            id="filter-pack"
            value={pack}
            onChange={(e) => setPack(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
          <label htmlFor="filter-grade" className="text-sm font-medium text-slate-700">
            {t('filterGrade')}
          </label>
          <select
            id="filter-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <option value="">{t('allGrades')}</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {t('gradeOption', { grade: g })}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-type" className="text-sm font-medium text-slate-700">
            {t('filterType')}
          </label>
          <select
            id="filter-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
        <p className="text-sm text-slate-600" aria-live="polite">
          {t('results', { count: filtered.length })}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clear}
            className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {t('noResults')}
        </p>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ meta, tags }) => (
            <section key={meta.pack} aria-labelledby={`pack-${meta.pack}`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
                <h2 id={`pack-${meta.pack}`} className="text-lg font-bold text-slate-900">
                  {locale === 'zh-TW' ? meta.name.zh : meta.name.en}
                </h2>
                <span className="text-sm text-slate-500">
                  {t('migratedOf', { migrated: meta.migratedCount, official: meta.officialTotal })}
                  {meta.current && <span className="ml-2 text-emerald-600">· {t('current')}</span>}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
