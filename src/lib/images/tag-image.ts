/**
 * Gated tag-image resolution (M7) — the FIRST real consumer of the M5 approval
 * gate (ADR-0003). Pure consumer of a passed `SupabaseClient`, so the same
 * logic is unit-testable with stub clients (no live bucket, no service_role).
 *
 * Order is deliberate and FAIL-CLOSED:
 *   1. isApproved() FIRST — unapproved/anon get `forbidden` before any catalog
 *      lookup, so we never leak whether a tag/image exists.
 *   2. resolve the canonical tagId → pack/num via the catalog (num alone is not
 *      unique — reprints repeat across packs).
 *   3. mint a SHORT-LIVED signed URL from the private bucket. Any error / no
 *      data ⇒ `not-found` — never a fallback to public art.
 *
 * No service_role: the signed URL is minted on the user's own session; the
 * bucket's approved-only SELECT policy (0003) is the storage-level guarantee.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { isApproved } from '@/lib/auth/approval';
import { getScoredTag } from '@/data/catalog';

/** Private bucket holding official tag art (see migration 0003). */
export const BUCKET = 'tag-images';

/** Signed URLs are short-lived so approval is effectively re-checked per load. */
export const SIGNED_URL_TTL_SECONDS = 60;

/** Object key convention: `{pack}/{num}.png` (e.g. `s1/R-1-1.png`). */
export function tagImageKey(pack: string, num: string): string {
  return `${pack}/${num}.png`;
}

/** Shape of the dynamic route param — a canonical tagId (`${pack}-${num}`). */
const TagIdParam = z.string().regex(/^(g1|s1|s2|s3|s4|sp)-.+$/);

export type TagImageResult =
  | { status: 'ok'; url: string }
  | { status: 'forbidden' }
  | { status: 'not-found' };

/**
 * Resolve a signed URL for a tag's image, gated by approval. Returns a status
 * the route maps to 302 / 403 / 404.
 */
export async function getTagImageUrl(
  supabase: SupabaseClient,
  tagId: string,
): Promise<TagImageResult> {
  // 1. The gate — reused verbatim from M5, called before any lookup.
  if (!(await isApproved(supabase))) return { status: 'forbidden' };

  // 2. Validate + resolve the canonical id to pack/num.
  const parsed = TagIdParam.safeParse(tagId);
  if (!parsed.success) return { status: 'not-found' };
  const entry = getScoredTag(parsed.data);
  if (!entry) return { status: 'not-found' };

  // 3. Mint a short-lived signed URL; fail closed on any error/empty result.
  const key = tagImageKey(entry.tag.pack, entry.tag.num);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return { status: 'not-found' };

  return { status: 'ok', url: data.signedUrl };
}
