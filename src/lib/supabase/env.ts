/**
 * Public Supabase env, read by name and validated once.
 *
 * ONLY the publishable/anon key and project URL are used — both are public,
 * browser-safe `NEXT_PUBLIC_*` values. The service_role/secret key is never
 * read, requested, or referenced anywhere in this codebase.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const SUPABASE_URL = required(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
