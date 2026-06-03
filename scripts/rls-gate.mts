/**
 * SECURITY GATE — cross-user RLS isolation proof for `collection_items`.
 *
 * Uses ONLY the public anon key and TWO REAL magic-link sessions (no
 * service_role, no admin API). You paste the 6-digit codes from your inbox.
 *
 * Proves:
 *   1. User A can INSERT a row (auth.uid() = user_id).
 *   2. User B CANNOT SELECT A's row (0 rows).
 *   3. User B CANNOT UPDATE A's row (0 rows affected).
 *   4. User B CANNOT DELETE A's row (0 rows affected).
 *   5. User A CAN SELECT its own row (1 row).
 * Cleanup: A deletes its row via RLS.
 *
 * Run:  pnpm gate:rls
 * (The pg_policies assertion is performed separately by the agent via the
 *  Supabase MCP; this script is the live behavioral proof.)
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function loadEnv(): { url: string; anonKey: string } {
  const raw = readFileSync('.env.local', 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] && m[2] !== undefined) {
      env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
    );
  }
  return { url, anonKey };
}

/**
 * No-op WebSocket stub. The gate only performs PostgREST HTTP operations and
 * never subscribes to realtime channels. However, `@supabase/realtime-js`
 * throws at client construction when neither `globalThis.WebSocket` nor
 * `options.transport` is present (Node 20 has no native WebSocket).
 * Providing a stub constructor satisfies that check without opening any socket.
 */
class NoopWS {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_address: string, _protocols?: string | string[]) {}
  close() {}
  send(_data: unknown) {}
}

function freshClient(url: string, anonKey: string): SupabaseClient {
  // Each client keeps its own in-memory session so A and B never share auth.
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: NoopWS as unknown as typeof WebSocket },
  });
}

async function signInViaOtp(
  client: SupabaseClient,
  rl: ReturnType<typeof createInterface>,
  label: string,
): Promise<{ email: string; userId: string }> {
  const email = (await rl.question(`\n[${label}] email: `)).trim();
  const { error: sendErr } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (sendErr) throw new Error(`[${label}] signInWithOtp failed: ${sendErr.message}`);
  console.log(`[${label}] code sent to ${email}. Check the inbox.`);

  const token = (await rl.question(`[${label}] paste the 6-digit code: `)).trim();
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error || !data.user) {
    throw new Error(`[${label}] verifyOtp failed: ${error?.message ?? 'no user'}`);
  }
  console.log(`[${label}] signed in as ${data.user.id}`);
  return { email, userId: data.user.id };
}

type Check = { name: string; pass: boolean; detail: string };

async function main(): Promise<void> {
  const { url, anonKey } = loadEnv();
  const clientA = freshClient(url, anonKey);
  const clientB = freshClient(url, anonKey);
  const rl = createInterface({ input, output });

  const checks: Check[] = [];
  let insertedId: string | null = null;

  try {
    console.log('=== RLS cross-user isolation gate ===');
    const a = await signInViaOtp(clientA, rl, 'A');
    const b = await signInViaOtp(clientB, rl, 'B');

    if (a.userId === b.userId) {
      throw new Error('A and B resolved to the SAME user — use two different emails.');
    }

    const tagId = `gate-test-${Date.now()}`;

    // 1. A inserts its own row.
    {
      const { data, error } = await clientA
        .from('collection_items')
        .insert({ user_id: a.userId, tag_id: tagId, status: 'owned', quantity: 1 })
        .select('*')
        .single();
      const pass = !error && !!data;
      insertedId = data?.id ?? null;
      checks.push({
        name: 'A can INSERT own row',
        pass,
        detail: pass ? `row id ${insertedId}` : `error: ${error?.message}`,
      });
    }

    if (!insertedId) throw new Error('Cannot continue: A failed to insert a row.');

    // 2. B cannot SELECT A's row.
    {
      const { data, error } = await clientB
        .from('collection_items')
        .select('*')
        .eq('id', insertedId);
      const rows = data?.length ?? 0;
      checks.push({
        name: "B CANNOT SELECT A's row",
        pass: !error && rows === 0,
        detail: `rows returned: ${rows}${error ? `, error: ${error.message}` : ''}`,
      });
    }

    // 3. B cannot UPDATE A's row (0 rows affected).
    {
      const { data, error } = await clientB
        .from('collection_items')
        .update({ quantity: 999 })
        .eq('id', insertedId)
        .select('*');
      const affected = data?.length ?? 0;
      checks.push({
        name: "B CANNOT UPDATE A's row",
        pass: affected === 0,
        detail: `rows affected: ${affected}${error ? `, error: ${error.message}` : ''}`,
      });
    }

    // 4. B cannot DELETE A's row (0 rows affected).
    {
      const { data, error } = await clientB
        .from('collection_items')
        .delete()
        .eq('id', insertedId)
        .select('*');
      const affected = data?.length ?? 0;
      checks.push({
        name: "B CANNOT DELETE A's row",
        pass: affected === 0,
        detail: `rows affected: ${affected}${error ? `, error: ${error.message}` : ''}`,
      });
    }

    // 5. A can still SELECT its own row (proves B's ops were truly no-ops).
    {
      const { data, error } = await clientA
        .from('collection_items')
        .select('*')
        .eq('id', insertedId)
        .single();
      const pass =
        !error && !!data && data.quantity === 1 && data.user_id === a.userId;
      checks.push({
        name: 'A CAN SELECT own row (unchanged)',
        pass,
        detail: pass
          ? `quantity still ${data.quantity}`
          : `error: ${error?.message}, quantity: ${data?.quantity}`,
      });
    }
  } finally {
    // Cleanup: A removes its own row via RLS.
    if (insertedId) {
      const { error } = await clientA
        .from('collection_items')
        .delete()
        .eq('id', insertedId);
      console.log(
        error ? `\ncleanup: FAILED (${error.message})` : '\ncleanup: A deleted its test row',
      );
    }
    rl.close();
  }

  console.log('\n=== Results ===');
  for (const c of checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  }
  const allPass = checks.length === 5 && checks.every((c) => c.pass);
  console.log(`\nGATE: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('\nGATE: FAIL (error)');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
