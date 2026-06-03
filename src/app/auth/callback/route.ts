import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Magic-link callback. Supabase redirects here with a PKCE `code`; we exchange
 * it for a session cookie and bounce to `next` (the localized catalog). This
 * route is intentionally outside the `[locale]` segment and excluded from the
 * next-intl middleware matcher so it is never localized or rewritten.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNext(searchParams.get('next'));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}?auth_error=1`);
}

/** Only allow same-site relative paths to prevent open-redirects. */
function sanitizeNext(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/';
}
