/**
 * SECURITY GATE — cross-user RLS isolation proof for `collection_items`.
 *
 * Uses ONLY the public anon key and TWO REAL email+PASSWORD sessions (no
 * service_role, no admin API, no email/SMTP). The script creates two throwaway
 * test users via the normal anon-key signUp flow and signs them in by password.
 *
 * WHY PASSWORD (not OTP/magic-link): editing the OTP email template to emit a
 * 6-digit code requires custom SMTP on this project, and the default email
 * flows were unreliable headlessly. Password sign-in needs no email at all —
 * it only needs the two users to be confirmed. If "Confirm email" is enabled
 * the script cannot confirm them without admin access, so it prints the exact
 * dashboard steps and exits FAIL (see CONFIRMATION NOTE below).
 *
 * SECURITY: this gate deliberately never uses the service_role / secret key.
 * Everything here runs with the same anon key a browser client would use.
 *
 * Proves:
 *   1. User A can INSERT a row (auth.uid() = user_id).
 *   2. User B CANNOT SELECT A's row (0 rows).
 *   3. User B CANNOT UPDATE A's row (0 rows affected).
 *   4. User B CANNOT DELETE A's row (0 rows affected).
 *   5. User A CAN SELECT its own row (1 row).
 * Cleanup: A deletes its row via RLS; the script prints how to remove the two
 * throwaway test users (user deletion needs admin access we intentionally lack).
 *
 * Run:  pnpm gate:rls
 * (The pg_policies assertion is performed separately by the agent via the
 *  Supabase MCP; this script is the live behavioral proof.)
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stdout as output } from 'node:process';

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

type Cred = { email: string; password: string };

/** Strong, throwaway password generated per run. Mixes classes to satisfy any
 * reasonable password policy; never logged. */
function generatePassword(): string {
  return `${randomBytes(18).toString('base64url')}aA1!`;
}

/** Thrown when sign-in is blocked solely because the user is unconfirmed. */
class EmailNotConfirmedError extends Error {
  constructor() {
    super('email not confirmed');
    this.name = 'EmailNotConfirmedError';
  }
}

/** Create a throwaway user with the anon key. No email is consumed by the gate;
 * if "Confirm email" is on, Supabase may try to send one, but we never read it. */
async function signUpUser(
  client: SupabaseClient,
  cred: Cred,
  label: string,
): Promise<void> {
  const { error } = await client.auth.signUp({
    email: cred.email,
    password: cred.password,
  });
  // "User already registered" is fine on a re-run with a colliding email; we
  // still attempt password sign-in next.
  if (error && !/already registered|already exists/i.test(error.message)) {
    throw new Error(`[${label}] signUp failed: ${error.message}`);
  }
}

/** Sign in by password and return the authenticated user id. */
async function signInUser(
  client: SupabaseClient,
  cred: Cred,
  label: string,
): Promise<{ email: string; userId: string }> {
  const { data, error } = await client.auth.signInWithPassword({
    email: cred.email,
    password: cred.password,
  });
  if (error || !data.user) {
    if (/email not confirmed|not confirmed/i.test(error?.message ?? '')) {
      throw new EmailNotConfirmedError();
    }
    throw new Error(`[${label}] signInWithPassword failed: ${error?.message ?? 'no user'}`);
  }
  console.log(`[${label}] signed in as ${data.user.id}`);
  return { email: cred.email, userId: data.user.id };
}

function printConfirmationInstructions(emailA: string, emailB: string): void {
  output.write(
    [
      '',
      '────────────────────────────────────────────────────────────────',
      'GATE BLOCKED: the two test users exist but are NOT confirmed, so',
      'password sign-in is refused. No email/SMTP is available to confirm',
      'them, and this gate intentionally does not use the service_role key.',
      '',
      'Do ONE of the following in the Supabase dashboard, then re-run',
      '`pnpm gate:rls` (a fresh pair of users is created each run):',
      '',
      'OPTION 1 — temporarily allow unconfirmed sign-in (fastest):',
      '  1. Dashboard → Authentication → Sign In / Providers → Email.',
      '  2. Turn OFF "Confirm email" (a.k.a. "Enable email confirmations").',
      '  3. Save, re-run `pnpm gate:rls`.',
      '  4. IMPORTANT: turn "Confirm email" back ON afterward to restore',
      '     your original auth config.',
      '',
      'OPTION 2 — manually confirm just these two users (leaves config as-is):',
      '  1. Dashboard → Authentication → Users.',
      `  2. Find ${emailA}`,
      `         and ${emailB}`,
      '  3. For each: ⋯ menu → "Confirm email" (or "Send confirmation" is NOT',
      '     needed — pick the confirm action).',
      '  4. Re-run `pnpm gate:rls` — but note step (1) creates NEW users with a',
      '     new timestamp each run, so for Option 2 keep these exact users:',
      '     re-running regenerates emails. If you confirm manually, instead',
      '     prefer OPTION 1 which works with freshly-created users.',
      '',
      'Also ensure Authentication → Sign In / Providers → Email has',
      '"Allow new users to sign up" ENABLED, or signUp will be rejected.',
      '────────────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}

type Check = { name: string; pass: boolean; detail: string };

async function main(): Promise<void> {
  const { url, anonKey } = loadEnv();
  const clientA = freshClient(url, anonKey);
  const clientB = freshClient(url, anonKey);

  const ts = Date.now();
  // example.com / RFC-2606 reserved domains are rejected by GoTrue's validator,
  // so default to a domain it accepts. Override with RLS_GATE_EMAIL_DOMAIN if
  // your project has an email-domain allowlist.
  const domain = (process.env.RLS_GATE_EMAIL_DOMAIN ?? 'gmail.com').replace(/^@/, '');
  const credA: Cred = { email: `rls-gate-a-${ts}@${domain}`, password: generatePassword() };
  const credB: Cred = { email: `rls-gate-b-${ts}@${domain}`, password: generatePassword() };

  const checks: Check[] = [];
  let insertedId: string | null = null;

  try {
    console.log('=== RLS cross-user isolation gate (password test users) ===');
    console.log(`test user A: ${credA.email}`);
    console.log(`test user B: ${credB.email}`);

    // Create both throwaway users with the anon key.
    await signUpUser(clientA, credA, 'A');
    await signUpUser(clientB, credB, 'B');

    // Sign both in by password → two independent authenticated sessions.
    let a: { email: string; userId: string };
    let b: { email: string; userId: string };
    try {
      a = await signInUser(clientA, credA, 'A');
      b = await signInUser(clientB, credB, 'B');
    } catch (err) {
      if (err instanceof EmailNotConfirmedError) {
        printConfirmationInstructions(credA.email, credB.email);
        console.log('\nGATE: FAIL (test users not confirmed — see steps above)');
        process.exit(1);
      }
      throw err;
    }

    if (a.userId === b.userId) {
      throw new Error('A and B resolved to the SAME user — unexpected.');
    }

    const tagId = `gate-test-${ts}`;

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
    await clientA.auth.signOut();
    await clientB.auth.signOut();
  }

  console.log('\n=== Results ===');
  for (const c of checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  }
  const allPass = checks.length === 5 && checks.every((c) => c.pass);
  console.log(`\nGATE: ${allPass ? 'PASS' : 'FAIL'}`);

  // Throwaway-user removal: deleting a user needs admin access (service_role /
  // dashboard), which this gate intentionally avoids. Tell the operator how to
  // purge them so the auth user list stays clean.
  console.log(
    [
      '',
      'TEST USER CLEANUP (manual — gate avoids service_role/admin):',
      `  Dashboard → Authentication → Users → delete ${credA.email}`,
      `                                       and ${credB.email}`,
      '  (They are harmless throwaways with random passwords if left in place.)',
    ].join('\n'),
  );

  process.exit(allPass ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('\nGATE: FAIL (error)');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
