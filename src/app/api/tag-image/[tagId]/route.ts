import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getTagImageUrl } from '@/lib/images/tag-image';

/**
 * Gated tag-image route (M7). Keyed by the canonical tagId (`s1-R-1-1`), since
 * bare `num` is ambiguous across packs. On approval it 302-redirects to a
 * short-lived signed URL so a plain `<img src>` works natively; otherwise it
 * returns 403 (not approved/authed) or 404 (unknown tag / missing art).
 *
 * This route lives under /api, which the middleware matcher excludes — so the
 * in-route isApproved() check (inside getTagImageUrl) is the enforcement point,
 * not PROTECTED_PREFIXES.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { tagId: string } },
) {
  const supabase = createClient();
  const result = await getTagImageUrl(supabase, decodeURIComponent(params.tagId));

  if (result.status === 'ok') {
    // 302 to the signed URL; no-store so approval is re-checked on every load.
    return NextResponse.redirect(result.url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const status = result.status === 'forbidden' ? 403 : 404;
  return new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
}
