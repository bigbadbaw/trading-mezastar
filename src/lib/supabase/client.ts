'use client';

/**
 * Browser Supabase client (App Router). Used by client components for auth and
 * collection CRUD; all access is governed by RLS (the anon key carries the
 * user's session, never elevated rights).
 */

import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
