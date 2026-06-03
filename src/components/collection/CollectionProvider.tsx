'use client';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getMyCollection,
  removeFromCollection,
  setQuantity as setQuantityRow,
  setStatus as setStatusRow,
  type CollectionItem,
  type CollectionStatus,
} from '@/data/collection';
import { createClient } from '@/lib/supabase/client';

interface CollectionContextValue {
  /** Resolved auth: null until the first auth check completes. */
  user: User | null;
  authReady: boolean;
  /** Map keyed by tagId for the signed-in user's collection. */
  items: ReadonlyMap<string, CollectionItem>;
  setStatus: (tagId: string, status: CollectionStatus) => Promise<void>;
  setQuantity: (tagId: string, quantity: number) => Promise<void>;
  remove: (tagId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (supabaseRef.current === null) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<ReadonlyMap<string, CollectionItem>>(
    new Map(),
  );

  const reload = useCallback(async () => {
    try {
      const rows = await getMyCollection(supabase);
      setItems(new Map(rows.map((row) => [row.tag_id, row])));
    } catch {
      setItems(new Map());
    }
  }, [supabase]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setAuthReady(true);
      if (data.user) void reload();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void reload();
      } else {
        setItems(new Map());
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, reload]);

  const applyOptimistic = useCallback(
    (tagId: string, next: CollectionItem | null) => {
      setItems((prev) => {
        const map = new Map(prev);
        if (next === null) map.delete(tagId);
        else map.set(tagId, next);
        return map;
      });
    },
    [],
  );

  const setStatus = useCallback(
    async (tagId: string, status: CollectionStatus) => {
      const prev = items.get(tagId);
      try {
        const row = await setStatusRow(supabase, tagId, status);
        applyOptimistic(tagId, row);
      } catch {
        applyOptimistic(tagId, prev ?? null);
        await reload();
      }
    },
    [supabase, items, applyOptimistic, reload],
  );

  const setQuantity = useCallback(
    async (tagId: string, quantity: number) => {
      const prev = items.get(tagId);
      try {
        const row = await setQuantityRow(supabase, tagId, quantity);
        applyOptimistic(tagId, row);
      } catch {
        applyOptimistic(tagId, prev ?? null);
        await reload();
      }
    },
    [supabase, items, applyOptimistic, reload],
  );

  const remove = useCallback(
    async (tagId: string) => {
      const prev = items.get(tagId);
      applyOptimistic(tagId, null);
      try {
        await removeFromCollection(supabase, tagId);
      } catch {
        applyOptimistic(tagId, prev ?? null);
        await reload();
      }
    },
    [supabase, items, applyOptimistic, reload],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setItems(new Map());
  }, [supabase]);

  const value = useMemo<CollectionContextValue>(
    () => ({ user, authReady, items, setStatus, setQuantity, remove, signOut }),
    [user, authReady, items, setStatus, setQuantity, remove, signOut],
  );

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return ctx;
}
