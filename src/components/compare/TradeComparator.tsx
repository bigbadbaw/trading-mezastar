'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ScoredTag } from '@/data/catalog';
import { compareBaskets, type BasketLine } from '@/lib/compare/basket';

import { BasketPanel, type SideId } from './BasketPanel';
import { CollectionPicker } from './CollectionPicker';
import { TagPicker } from './TagPicker';
import { VerdictPanel } from './VerdictPanel';

type Baskets = Record<SideId, ReadonlyMap<string, number>>;

const EMPTY: Baskets = { mine: new Map(), theirs: new Map() };

/**
 * The trade comparator. Baskets are EPHEMERAL React state keyed by `tag.tagId`
 * (identity, membership, dedupe — never `num`). Scoring/fairness come entirely
 * from the engine via `compareBaskets`; this component owns only UI state.
 */
export function TradeComparator({
  entries,
  locale,
}: {
  entries: ScoredTag[];
  locale: string;
}) {
  const t = useTranslations('compare');
  const [baskets, setBaskets] = useState<Baskets>(EMPTY);

  const byId = useMemo(
    () => new Map(entries.map((e) => [e.tag.tagId, e])),
    [entries],
  );

  const add = useCallback(
    (side: SideId, tagId: string, quantity = 1) => {
      if (!byId.has(tagId)) return;
      setBaskets((prev) => {
        const next = new Map(prev[side]);
        next.set(tagId, (next.get(tagId) ?? 0) + quantity);
        return { ...prev, [side]: next };
      });
    },
    [byId],
  );

  const setQuantity = useCallback((side: SideId, tagId: string, quantity: number) => {
    setBaskets((prev) => {
      const next = new Map(prev[side]);
      if (quantity <= 0) next.delete(tagId);
      else next.set(tagId, quantity);
      return { ...prev, [side]: next };
    });
  }, []);

  const remove = useCallback((side: SideId, tagId: string) => {
    setBaskets((prev) => {
      const next = new Map(prev[side]);
      next.delete(tagId);
      return { ...prev, [side]: next };
    });
  }, []);

  const clearSide = useCallback((side: SideId) => {
    setBaskets((prev) => ({ ...prev, [side]: new Map() }));
  }, []);

  const clearAll = useCallback(() => setBaskets(EMPTY), []);

  const linesFor = useCallback(
    (side: SideId): BasketLine[] => {
      const out: BasketLine[] = [];
      for (const [tagId, quantity] of baskets[side]) {
        const entry = byId.get(tagId);
        if (entry) out.push({ entry, quantity });
      }
      return out;
    },
    [baskets, byId],
  );

  const result = useMemo(
    () => compareBaskets(linesFor('mine'), linesFor('theirs')),
    [linesFor],
  );

  const bothSides = result.left.lines.length > 0 && result.right.lines.length > 0;
  const anyTags = result.left.lines.length > 0 || result.right.lines.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {bothSides ? (
        <VerdictPanel result={result} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
          {t('addBothSides')}
        </p>
      )}

      <div className="flex justify-end">
        {anyTags && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t('clearAll')}
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BasketPanel
          side="mine"
          score={result.left}
          locale={locale}
          onSetQuantity={(tagId, q) => setQuantity('mine', tagId, q)}
          onRemove={(tagId) => remove('mine', tagId)}
          onClear={() => clearSide('mine')}
        />
        <BasketPanel
          side="theirs"
          score={result.right}
          locale={locale}
          onSetQuantity={(tagId, q) => setQuantity('theirs', tagId, q)}
          onRemove={(tagId) => remove('theirs', tagId)}
          onClear={() => clearSide('theirs')}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">{t('addHeading')}</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{t('fromCollection')}</h3>
            <CollectionPicker byId={byId} onAdd={add} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{t('fromCatalog')}</h3>
            <TagPicker entries={entries} locale={locale} onAdd={add} />
          </div>
        </div>
      </section>
    </div>
  );
}
