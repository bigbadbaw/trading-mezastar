# ADR-0005: M4a — magic-link auth + RLS-isolated per-user collection

- **Status:** Accepted
- **Date:** 2026-06-04
- **Deciders:** Anthony

## Context

ADR-0004 accepted Supabase for auth + per-user data and left the concrete login method, schema,
and RLS design as follow-ups. M4a implements the foundation (the M4b trade comparator consumes
it). Two hard constraints shaped the design:

1. The M3 catalog renders as **static** pages (757 prerendered routes) and the scoring engine is
   **pure**. Reading the session from server cookies in the `[locale]` layout would force every
   page dynamic. We must not regress that.
2. Login is **required** to use collection features because the tool is shared with other users,
   so cross-user data isolation must be provable, not assumed.

## Decision

- **Auth method: passwordless email magic link** (`signInWithOtp`). No passwords to store or
  leak; appropriate for an audience that includes kids/parents. OAuth was deferred — it adds
  provider config and consent-screen overhead without a clear benefit here.
- **Client-island architecture.** The auth indicator (`AuthStatus`) and collection controls
  (`CollectionControls`) are client components backed by the browser Supabase client and
  `onAuthStateChange`; a `CollectionProvider` context holds the session + collection map. The
  **server** client is used only by the `/auth/callback` route handler and the middleware session
  refresh. This keeps catalog/detail pages static and the scoring layer untouched.
- **Schema.** A single `public.collection_items` table: `(id, user_id → auth.users, tag_id text,
  status in (owned|wanted|most_wanted), quantity int ≥ 0, created_at, updated_at)`, unique on
  `(user_id, tag_id)`, indexed on `user_id`, with an `updated_at` trigger. `tag_id` is the stable
  app `${pack}-${num}` and is **intentionally not a DB FK** — tags are static app data, not DB rows.
- **Row-Level Security is the security boundary.** RLS is enabled with four policies scoped to
  the `authenticated` role: SELECT/UPDATE/DELETE `using (auth.uid() = user_id)` and
  INSERT/UPDATE `with check (auth.uid() = user_id)`. With only `authenticated` policies present,
  anon and any non-owner are default-denied. `user_id` is always derived from the session in the
  data layer, never client-supplied.
- The `set_updated_at` trigger function pins `search_path = ''` to satisfy the Supabase security
  linter (`0011_function_search_path_mutable`).

## Alternatives considered

- **Read session in the server layout** — rejected; forces all static pages dynamic.
- **OAuth / password auth** — deferred; more config/risk than magic link for this audience.
- **`tag_id` as a FK to a tags table** — rejected; tags are static app data, not in Postgres.
- **`service_role` for the security test** — forbidden by project posture; the gate uses two real
  magic-link sessions with the anon key only.

## Consequences

- Positive: real per-user collections with provable isolation; static catalog + pure scoring
  preserved; no password storage; schema versioned in `supabase/migrations/0001_m4a_collection.sql`.
- Negative / risks: collection UI cannot be server-rendered (client islands only); a brief
  unauthenticated flash is avoided via an `authReady` gate. The interactive RLS gate
  (`pnpm gate:rls`) needs inbox access and is kept out of CI.
- Follow-ups / revisit triggers: M4b comparator consumes the collection; revisit if collections
  grow large enough to need pagination, or if public (non-invite) access changes the threat model.
