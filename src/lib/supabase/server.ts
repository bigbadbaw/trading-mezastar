/**
 * Server Supabase client (App Router) — cookie-based session, used by the
 * magic-link callback route and any server-side reads. Reads/writes the session
 * cookie via next/headers. Like the browser client, it uses ONLY the anon key;
 * RLS is the security boundary.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `set` from a Server Component is a no-op; the middleware refresh
          // handles cookie writes. Safe to ignore here.
        }
      },
    },
  });
}
