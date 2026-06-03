import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

import { routing } from './i18n/routing';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './lib/supabase/env';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // next-intl owns redirects/rewrites and produces the response we return.
  const response = intlMiddleware(request);

  // Refresh the Supabase session cookie on every request (App Router SSR
  // pattern), writing any rotated tokens onto the intl response.
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Match all paths except API, the auth callback, Next internals, and files.
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
