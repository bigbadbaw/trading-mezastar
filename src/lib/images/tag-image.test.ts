import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { BUCKET, SIGNED_URL_TTL_SECONDS, getTagImageUrl } from './tag-image';

// No live bucket and NO service_role — the same anon-key/stub pattern as
// scripts/rls-gate.mts. A spy records every createSignedUrl call so we can prove
// an unapproved request mints NOTHING.

interface SignCall {
  bucket: string;
  key: string;
  ttl: number;
}

function stubClient(opts: {
  user: { id: string } | null;
  approved?: boolean;
  signError?: boolean;
  signedUrl?: string | null;
}): { client: SupabaseClient; calls: SignCall[] } {
  const calls: SignCall[] = [];
  const profile = {
    select: () => profile,
    eq: () => profile,
    maybeSingle: async () => ({
      data: opts.user ? { approved: opts.approved ?? false } : null,
      error: null,
    }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: opts.user }, error: null }) },
    from: () => profile,
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (key: string, ttl: number) => {
          calls.push({ bucket, key, ttl });
          if (opts.signError) return { data: null, error: { message: 'Object not found' } };
          return {
            data: { signedUrl: opts.signedUrl ?? 'https://stub.storage/signed/abc' },
            error: null,
          };
        },
      }),
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const APPROVED_USER = { id: '11111111-1111-1111-1111-111111111111' };

describe('getTagImageUrl — the M7 gate', () => {
  it('unapproved user → forbidden, and NO signed URL is minted', async () => {
    const { client, calls } = stubClient({ user: APPROVED_USER, approved: false });
    const result = await getTagImageUrl(client, 's1-R-1-1');
    expect(result.status).toBe('forbidden');
    expect(calls).toHaveLength(0); // never reached storage
  });

  it('unauthenticated request → forbidden, no signed URL', async () => {
    const { client, calls } = stubClient({ user: null });
    const result = await getTagImageUrl(client, 's1-R-1-1');
    expect(result.status).toBe('forbidden');
    expect(calls).toHaveLength(0);
  });

  it('approved user + valid tagId → ok with a signed URL from the private bucket', async () => {
    const { client, calls } = stubClient({ user: APPROVED_USER, approved: true });
    const result = await getTagImageUrl(client, 's1-R-1-1');
    expect(result).toEqual({ status: 'ok', url: 'https://stub.storage/signed/abc' });
    // Reprint key is pack-qualified, short TTL, correct bucket.
    expect(calls).toEqual([{ bucket: BUCKET, key: 's1/R-1-1.png', ttl: SIGNED_URL_TTL_SECONDS }]);
  });

  it('approved user + unknown tagId → not-found (and nothing signed)', async () => {
    const { client, calls } = stubClient({ user: APPROVED_USER, approved: true });
    const result = await getTagImageUrl(client, 's1-9-9-999');
    expect(result.status).toBe('not-found');
    expect(calls).toHaveLength(0);
  });

  it('malformed tagId → not-found (Zod rejects before any lookup)', async () => {
    const { client, calls } = stubClient({ user: APPROVED_USER, approved: true });
    const result = await getTagImageUrl(client, 'not-a-tag-id');
    expect(result.status).toBe('not-found');
    expect(calls).toHaveLength(0);
  });

  it('approved but image missing → not-found, NEVER a public fallback', async () => {
    const { client } = stubClient({ user: APPROVED_USER, approved: true, signError: true });
    const result = await getTagImageUrl(client, 's4-1-4-001');
    expect(result.status).toBe('not-found');
  });
});
