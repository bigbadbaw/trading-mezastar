import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing, type Locale } from './i18n/routing';
import { getApprovalState, isProtectedPath } from './lib/auth/approval';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './lib/supabase/env';

const intlMiddleware = createMiddleware(routing);

/** Split a pathname into its locale (if any) and the remaining path. Robust to
 *  the `localePrefix` config by testing the first segment against the locales. */
function splitLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return { locale: first as Locale, rest: segments.slice(1).join('/') };
  }
  return { locale: routing.defaultLocale, rest: segments.join('/') };
}

export async function middleware(request: NextRequest) {
  // next-intl owns redirects/rewrites and produces the response we return.
  const response = intlMiddleware(request);

  // Supabase client bound to this request/response so rotated tokens are written
  // back onto whatever response we ultimately return (App Router SSR pattern).
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

  const { locale, rest } = splitLocale(request.nextUrl.pathname);

  // Only the protected set pays for the profile lookup; every other route just
  // refreshes the session exactly as before (PROTECTED_PREFIXES is empty today).
  if (isProtectedPath(rest)) {
    const state = await getApprovalState(supabase);
    if (state.authenticated && !state.approved && rest !== 'pending') {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/pending`;
      url.search = '';
      const redirect = NextResponse.redirect(url);
      // Carry over any session cookies the refresh just rotated.
      for (const cookie of response.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }
  } else {
    // Refresh the Supabase session cookie on every request, as today.
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  // Match all paths except API, the auth callback, Next internals, and files.
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
