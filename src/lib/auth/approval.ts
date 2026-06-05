/**
 * Approval gate — the SINGLE SOURCE OF TRUTH for "is this user approved".
 *
 * A pure consumer of a passed `SupabaseClient`: it imports no env and no Next
 * APIs, so the same logic runs in the middleware (request-bound client), in
 * M7's image route (the next/headers server client), and in the RLS gate test.
 * It is deliberately FAIL-CLOSED — any error, missing profile row, or absent
 * session resolves to "not approved", because under-serving a member beats
 * leaking gated content (ADR-0003).
 *
 * `approved` lives on `public.profiles` and can only be set by the service_role
 * (admin); see supabase/migrations/0002_m5_invite_gate.sql. Nothing here can
 * change it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ApprovalState {
  /** A valid session exists. */
  authenticated: boolean;
  /** The user's profile row has `approved = true`. Always false when unauth. */
  approved: boolean;
  /** The session user id, or null when unauthenticated. */
  userId: string | null;
}

const UNAUTHENTICATED: ApprovalState = {
  authenticated: false,
  approved: false,
  userId: null,
};

/** Resolve the caller's approval state from their session + profile row. */
export async function getApprovalState(supabase: SupabaseClient): Promise<ApprovalState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return UNAUTHENTICATED;

  const { data, error } = await supabase
    .from('profiles')
    .select('approved')
    .eq('id', user.id)
    .maybeSingle();

  // Fail closed: only an explicit `approved = true` row counts as approved.
  const approved = !error && data !== null && data.approved === true;
  return { authenticated: true, approved, userId: user.id };
}

/** Convenience boolean — what M7's image route will gate on. */
export async function isApproved(supabase: SupabaseClient): Promise<boolean> {
  return (await getApprovalState(supabase)).approved;
}

/**
 * Page-path prefixes (the segment AFTER the locale, no leading slash) that the
 * middleware redirects unapproved users away from. EMPTY today: browsing stays
 * open per the M5 decision, and official images are gated by the route-level
 * `isApproved` check, not this redirect. M7 adds any member-only page prefixes
 * here (e.g. 'account'). `'pending'` must never appear — it is the destination.
 */
export const PROTECTED_PREFIXES: readonly string[] = [];

/** True when `restPath` (locale-stripped) is in/under a protected prefix. */
export function isProtectedPath(restPath: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => restPath === prefix || restPath.startsWith(`${prefix}/`),
  );
}
