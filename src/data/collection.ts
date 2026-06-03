/**
 * Per-user collection data layer.
 *
 * Storage-only: tags owned / wanted / most-wanted plus a quantity. No scoring or
 * comparison happens here (that is the M4b consumer). Every row is Zod-validated
 * at the boundary, `user_id` is always derived from the authenticated session
 * (never client-supplied), and Row-Level Security is the real safety boundary —
 * these functions cannot read or write another user's rows even if asked to.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const COLLECTION_STATUSES = ['owned', 'wanted', 'most_wanted'] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const CollectionStatusSchema = z.enum(COLLECTION_STATUSES);

/** A row of `public.collection_items` as returned by PostgREST. */
export const CollectionItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tag_id: z.string().min(1),
  status: CollectionStatusSchema,
  quantity: z.number().int().min(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CollectionItem = z.infer<typeof CollectionItemSchema>;

const TABLE = 'collection_items';

class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new NotAuthenticatedError();
  }
  return data.user.id;
}

function single(row: unknown): CollectionItem {
  return CollectionItemSchema.parse(row);
}

/** All of the signed-in user's collection rows (RLS restricts to the owner). */
export async function getMyCollection(
  supabase: SupabaseClient,
): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return z.array(CollectionItemSchema).parse(data ?? []);
}

/**
 * Set (or create) the status for a tag, preserving any existing quantity.
 * Upsert keys on the (user_id, tag_id) unique constraint.
 */
export async function setStatus(
  supabase: SupabaseClient,
  tagId: string,
  status: CollectionStatus,
): Promise<CollectionItem> {
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, tag_id: tagId, status },
      { onConflict: 'user_id,tag_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return single(data);
}

/**
 * Set the quantity for a tag the user already tracks. Quantity is only
 * meaningful for owned duplicates; the row must exist (created via setStatus).
 */
export async function setQuantity(
  supabase: SupabaseClient,
  tagId: string,
  quantity: number,
): Promise<CollectionItem> {
  const userId = await requireUserId(supabase);
  const safe = Math.max(0, Math.trunc(quantity));
  const { data, error } = await supabase
    .from(TABLE)
    .update({ quantity: safe })
    .eq('user_id', userId)
    .eq('tag_id', tagId)
    .select('*')
    .single();
  if (error) throw error;
  return single(data);
}

/** Remove a tag from the user's collection. */
export async function removeFromCollection(
  supabase: SupabaseClient,
  tagId: string,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('tag_id', tagId);
  if (error) throw error;
}
