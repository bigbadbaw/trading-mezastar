# ADR-0004: Supabase for auth + per-user data (not localStorage-only)

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Anthony

## Context

The community prototype stored everything in browser `localStorage` (no accounts; per-browser
data; JSON export/import to move between devices). The original plan for this project briefly
favored localStorage too. However, the tool is intended to be **opened to other users** beyond
the primary maintainer, which requires identity and cross-device/cross-user data.

## Decision

Use **Supabase** for authentication and a small Postgres database holding per-user collections
and favorites. Treat auth + data sync as its own architecture milestone.

## Alternatives considered

- **localStorage only** — rejected once multi-user was confirmed; cannot share identity or sync
  across users/devices. (Still fine as an offline cache layer if useful.)
- **Roll our own auth** — rejected; unnecessary complexity and risk versus Supabase's managed auth.

## Consequences

- Positive: real multi-user support; managed auth; gating mechanism for the image posture in
  ADR-0003.
- Negative / risks: biggest source of architecture complexity (auth flows, RLS policies, env
  secrets, a hosted DB). Must configure Row-Level Security so users only see their own data.
- Follow-ups: define the DB schema (users, collections, favorites); choose login method
  (magic-link vs. OAuth); document RLS policies.
